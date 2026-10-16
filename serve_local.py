"""Local web server: serves index.html + facts.js and forwards /api/chat to your vLLM model. No dependencies."""
import json, http.server, urllib.request, os
ROOT = os.path.dirname(os.path.abspath(__file__))
LLM = os.environ.get("LLM_URL", "http://localhost:8000/v1").rstrip("/")
MODEL = os.environ.get("LLM_MODEL", "finance-llm")
PORT = int(os.environ.get("PORT", "3000"))
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def do_POST(self):
        if self.path != "/api/chat": return self.send_error(404)
        try:
            body = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))))
            clean = [{"role": "assistant" if m.get("role") == "assistant" else "user", "content": str(m.get("content", ""))[:12000]} for m in body["messages"][-12:]]
            while clean and clean[0]["role"] != "user": clean.pop(0)
            if not clean or clean[-1]["role"] != "user": raise ValueError("last message must be from user")
            req = urllib.request.Request(LLM + "/chat/completions", headers={"Content-Type": "application/json"},
                data=json.dumps({"model": MODEL, "messages": clean, "max_tokens": 400, "temperature": 0}).encode())
            text = json.load(urllib.request.urlopen(req, timeout=120))["choices"][0]["message"]["content"]
            code, out = 200, {"text": text}
        except Exception as e:
            code, out = 502, {"error": str(e)[:200]}
        data = json.dumps(out).encode()
        self.send_response(code); self.send_header("Content-Type", "application/json"); self.send_header("Content-Length", str(len(data))); self.end_headers(); self.wfile.write(data)
print("Open http://localhost:%d  (model server: %s)" % (PORT, LLM))
http.server.ThreadingHTTPServer(("127.0.0.1", PORT), H).serve_forever()
