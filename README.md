# Finance model v2: code does the math, the model writes the words

facts.js computes every figure (savings gap, 20% cuts, yearly-to-monthly, projections, health score).
The web page and gen_data.py both use it, so training and serving see identical inputs.
The model only copies values from `facts` into sentences.

## Train (Linux, NVIDIA)
    conda activate fin
    node --version || conda install -y -c conda-forge nodejs     # gen_data.py needs node
    python gen_data.py 6000
    nohup python train.py > train.log 2>&1 &
    tail -f train.log
    python eval.py          # after "saved finance-llm-merged"

train.py uses batch 4 x accumulation 4. On "CUDA out of memory" use 2 x 8.

## Serve and connect
    conda activate serve && vllm serve ./finance-llm-merged --served-model-name finance-llm --port 8000
    echo "LLM_URL=http://localhost:8000/v1" > .env && vercel dev
index.html loads facts.js from the same folder, so deploy both files.
