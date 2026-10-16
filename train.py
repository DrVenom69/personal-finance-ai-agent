"""QLoRA fine-tune of a small open model. Built for a free Colab T4. Run gen_data.py first.
pip install -q transformers==4.46.3 peft==0.13.2 bitsandbytes==0.44.1 datasets==3.1.0 accelerate==1.1.1"""
import json, torch
from transformers import (AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig, Trainer, TrainingArguments, DataCollatorForSeq2Seq)
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
BASE = "Qwen/Qwen2.5-1.5B-Instruct"   # Apache-2.0
tok = AutoTokenizer.from_pretrained(BASE); tok.padding_side = "right"
def enc(row):
    m = row["messages"]
    prompt = tok.apply_chat_template(m[:1], tokenize=False, add_generation_prompt=True)
    p = tok(prompt, add_special_tokens=False)["input_ids"]
    a = tok(m[1]["content"] + "<|im_end|>", add_special_tokens=False)["input_ids"]
    ids = (p + a)[:3072]; lab = ([-100]*len(p) + a)[:3072]
    return {"input_ids": ids, "attention_mask": [1]*len(ids), "labels": lab}
load = lambda fn: [enc(json.loads(l)) for l in open(fn, encoding="utf-8")]
train, val = load("train.jsonl"), load("val.jsonl")
model = AutoModelForCausalLM.from_pretrained(BASE, quantization_config=BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.float16), device_map="auto")
model = prepare_model_for_kbit_training(model)
model = get_peft_model(model, LoraConfig(r=16, lora_alpha=32, lora_dropout=.05, task_type="CAUSAL_LM",
        target_modules=["q_proj","k_proj","v_proj","o_proj","gate_proj","up_proj","down_proj"]))
args = TrainingArguments(output_dir="out", num_train_epochs=2, per_device_train_batch_size=2, gradient_accumulation_steps=8,
        learning_rate=2e-4, warmup_ratio=.03, lr_scheduler_type="cosine", fp16=True, gradient_checkpointing=True, optim="paged_adamw_8bit",
        logging_steps=20, eval_strategy="steps", eval_steps=250, per_device_eval_batch_size=1, save_strategy="no", report_to="none")
Trainer(model=model, args=args, train_dataset=train, eval_dataset=val, data_collator=DataCollatorForSeq2Seq(tok, padding=True, label_pad_token_id=-100)).train()
model.save_pretrained("finance-lora"); tok.save_pretrained("finance-lora")
# merge adapter into a full fp16 model for serving
del model; torch.cuda.empty_cache()
from peft import PeftModel
full = AutoModelForCausalLM.from_pretrained(BASE, torch_dtype=torch.float16, device_map="auto")
PeftModel.from_pretrained(full, "finance-lora").merge_and_unload().save_pretrained("finance-llm-merged")
tok.save_pretrained("finance-llm-merged"); print("saved finance-llm-merged")
