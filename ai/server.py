
import os
import sys
import glob
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import uvicorn
from contextlib import asynccontextmanager

# Check for GPU availablity (simplified check)
try:
    import torch
    HAS_CUDA = torch.cuda.is_available()
    GPU_NAME = torch.cuda.get_device_name(0) if HAS_CUDA else "None"
except Exception:
    HAS_CUDA = False
    GPU_NAME = "None"

llm = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global llm
    print(f"[AI Server] Initializing on {'GPU (' + GPU_NAME + ')' if HAS_CUDA else 'CPU'}...")
    
    # auto-detect model in models/ directory
    models_dir = os.path.join(os.path.dirname(__file__), "..", "models")
    models = glob.glob(os.path.join(models_dir, "*.gguf"))
    
    # Download if missing (independent of import status)
    if not models:
        print(f"[AI Server] No .gguf models found in {models_dir}")
        print("[AI Server] Downloading Mistral-7B-Instruct-v0.2 (recommended compatible model)...")
        
        try:
            # Create models directory if it doesn't exist
            if not os.path.exists(models_dir):
                os.makedirs(models_dir)
                
            url = "https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.2-GGUF/resolve/main/mistral-7b-instruct-v0.2.Q4_K_M.gguf"
            dest_path = os.path.join(models_dir, "mistral-7b-instruct-v0.2.Q4_K_M.gguf")
            
            import requests
            from tqdm import tqdm
            
            response = requests.get(url, stream=True)
            total_size = int(response.headers.get('content-length', 0))
            
            with open(dest_path, "wb") as file, tqdm(
                desc="Downloading Model",
                total=total_size,
                unit='iB',
                unit_scale=True,
                unit_divisor=1024,
            ) as bar:
                for data in response.iter_content(chunk_size=1024):
                    size = file.write(data)
                    bar.update(size)
            
            print("[AI Server] Download complete.")
            models = [dest_path]
            
        except Exception as e:
            print(f"[AI Server] Failed to download model: {e}")
            print("[AI Server] Please manually download a .gguf model to the models/ directory.")

    try:
        from llama_cpp import Llama
        
        if models:
            model_path = models[0]
            print(f"[AI Server] Loading model: {model_path}")
            
            n_gpu_layers = -1 if HAS_CUDA else 0
            if HAS_CUDA:
                print("[AI Server] GPU Detected! Offloading all layers to GPU.")
            else:
                print("[AI Server] No GPU detected (or torch not installed). Running on CPU.")

            # Initialize Llama
            llm = Llama(
                model_path=model_path,
                n_gpu_layers=33 if HAS_CUDA else 0, # Offload most layers to GPU, but not all to avoid flatten error
                n_ctx=4096, # Adjust based on RAM
                verbose=False
            )
            print("[AI Server] Model loaded successfully.")
    except ImportError:
        print("\n\n" + "!"*50)
        print("[AI Server] ERROR: `llama-cpp-python` is not installed or failed to load.")
        print("[AI Server] Please install Visual Studio C++ Build Tools and run:")
        print("[AI Server] pip install llama-cpp-python")
        print("!"*50 + "\n\n")
    except Exception as e:
        print(f"[AI Server] Error loading model: {e}")
            
    yield
    print("[AI Server] Shutting down...")

app = FastAPI(lifespan=lifespan)

# Enable CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
import sqlite3
from datetime import datetime

# Database setup
DB_PATH = os.path.join(os.path.dirname(__file__), "vanguard_ai.db")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    # Sessions table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            game TEXT NOT NULL,
            title TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    # Messages table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES sessions (id)
        )
    """)
    conn.commit()
    conn.close()

init_db()

class Message(BaseModel):
    role: str
    content: str

class ChatCompletionRequest(BaseModel):
    messages: List[Message]
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 1024
    stream: Optional[bool] = False

@app.get("/health")
def health_check():
    return {
        "status": "ok", 
        "gpu": HAS_CUDA, 
        "gpu_name": GPU_NAME,
        "model_loaded": llm is not None
    }

@app.post("/v1/chat/completions")
def chat_completions(request: ChatCompletionRequest):
    if not llm:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    try:
        response = llm.create_chat_completion(
            messages=[m.dict() for m in request.messages],
            temperature=request.temperature,
            max_tokens=request.max_tokens,
            stream=request.stream
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class GuideRequest(BaseModel):
    game: str
    achievement: str

@app.post("/generate_guide")
def generate_guide(request: GuideRequest):
    if not llm:
        raise HTTPException(status_code=503, detail="Model not loaded. Brain is still initializing.")
    
    print(f"[AI Server] Generating guide for: {request.game} - {request.achievement}")
    
    # 1. Search for context (RAG)
    search_context = ""
    try:
        from ddgs import DDGS
        with DDGS() as ddgs:
            query = f"{request.game} {request.achievement} achievement guide"
            results = list(ddgs.text(query, max_results=3))
            search_context = "\n\n".join([f"Source: {r['title']}\n{r['body']}" for r in results])
        print(f"[AI Server] Retreived search context for '{request.achievement}'")
    except Exception as se:
        print(f"[AI Server] Search failed: {se}")

    try:
        # 2. Use the Agent with the retrieved context
        from praisonaiagents import Agent
        
        # Configure the agent to use local LLM
        port = int(os.getenv("PORT", 8000))
        os.environ["OPENAI_BASE_URL"] = f"http://localhost:{port}/v1"
        os.environ["OPENAI_API_KEY"] = "not-needed"
        os.environ["OPENAI_MODEL_NAME"] = "local-model"
        
        prompt = f"""You are a veteran gaming achievement hunter. 
Using the following research context, write a professional tactical guide for '{request.achievement}' in '{request.game}'.

RESEARCH CONTEXT:
{search_context if search_context else "No real-time data found. Use your internal knowledge."}

GUIDE FORMAT:
- Use # for the main title.
- Use ## for sections like "Requirements", "Strategy", and "Execution".
- Use bold text for key items, locations, or boss names.
- Use numbered lists for step-by-step instructions.
- Keep it concise but professional.

Write the guide in Markdown format."""

        guide_agent = Agent(
            name="Tactical Specialist",
            role="Gaming Expert",
            goal=f"Write the best guide for {request.achievement}.",
            backstory="You synthesize wiki data into actionable steps.",
            model="openai/local-model"
        )
        guide_agent.verbose = True
        
        # We pass the prompt directly to start() to give the agent its instructions
        print(f"[AI Server] Starting Agentic Synthesis...")
        result = guide_agent.start(prompt)
        
        return {"guide": str(result)}
        
    except Exception as e:
        print(f"[AI Server] Agent failed: {e}. Falling back to direct LLM.")
        try:
            # Direct LLM fallback with context
            system_prompt = "You are a gaming expert. Use the provided context to write a guide."
            user_prompt = f"GAME: {request.game}\nACHIEVEMENT: {request.achievement}\n\nCONTEXT:\n{search_context}\n\nWrite a step-by-step guide."
            
            res = llm.create_chat_completion(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=800
            )
            return {"guide": res['choices'][0]['message']['content']}
        except Exception as fallback_error:
            raise HTTPException(status_code=500, detail=str(e))

class ExpertRequest(BaseModel):
    game: str
    question: str
    session_id: Optional[str] = None

class SessionCreate(BaseModel):
    id: str
    game: str
    title: str

@app.get("/expert/sessions/{game}")
def list_sessions(game: str):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM sessions WHERE game = ? ORDER BY created_at DESC", (game,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

@app.post("/expert/sessions")
def create_session(session: SessionCreate):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO sessions (id, game, title) VALUES (?, ?, ?)", 
                       (session.id, session.game, session.title))
        conn.commit()
    except sqlite3.IntegrityError:
        pass # Session already exists
    conn.close()
    return {"status": "ok"}

@app.get("/expert/messages/{session_id}")
def list_messages(session_id: str):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC", (session_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

@app.post("/ask_expert")
def ask_expert(request: ExpertRequest):
    if not llm:
        raise HTTPException(status_code=503, detail="Model not loaded. Brain is still initializing.")
    
    if not request.session_id:
        raise HTTPException(status_code=400, detail="session_id is required")

    print(f"[AI Server] Expert Query: {request.game} - {request.question}")
    
    # Save user message
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)",
                   (request.session_id, "user", request.question))
    
    # Check if we need to auto-title the session
    cursor.execute("SELECT COUNT(*) FROM messages WHERE session_id = ?", (request.session_id,))
    count = cursor.fetchone()[0]
    if count == 1:
        # Update title based on first question
        title = (request.question[:47] + '..') if len(request.question) > 50 else request.question
        cursor.execute("UPDATE sessions SET title = ? WHERE id = ?", (title, request.session_id))
    
    conn.commit()

    # 1. Search for context (RAG)
    search_context = ""
    try:
        from ddgs import DDGS
        with DDGS() as ddgs:
            query = f"{request.game} {request.question} guide walkthrough"
            results = list(ddgs.text(query, max_results=4))
            search_context = "\n\n".join([f"Source: {r['title']}\n{r['body']}" for r in results])
        print(f"[AI Server] Retreived search context for query")
    except Exception as se:
        print(f"[AI Server] Search failed: {se}")

    try:
        # 2. Use the Agent
        from praisonaiagents import Agent
        
        port = int(os.getenv("PORT", 8000))
        os.environ["OPENAI_BASE_URL"] = f"http://localhost:{port}/v1"
        os.environ["OPENAI_API_KEY"] = "not-needed"
        os.environ["OPENAI_MODEL_NAME"] = "local-model"
        
        prompt = f"""You are an Expert Gaming AI. 
Answer the user's question about the game '{request.game}'.

USER QUESTION:
{request.question}

RESEARCH CONTEXT:
{search_context if search_context else "No real-time data found. Use your internal knowledge."}

GUIDELINES:
- Provide exact locations, stats, or steps.
- Use Markdown formatting (headers, bolding).
- If information is missing, state what you know and suggest alternatives.
- Keep it tactical and immersive."""

        agent = Agent(
            name="Combat Intelligence",
            role="Tactical Expert",
            goal=f"Solve the user's inquiry about {request.game}.",
            backstory="You are a data-driven gaming strategist with access to global wikis.",
            model="openai/local-model"
        )
        agent.verbose = True
        
        print(f"[AI Server] Starting Expert Analysis...")
        result = str(agent.start(prompt))
        
        # Save AI message
        cursor.execute("INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)",
                       (request.session_id, "assistant", result))
        conn.commit()
        conn.close()
        
        return {"answer": result}
        
    except Exception as e:
        print(f"[AI Server] Expert failed: {e}. Falling back to direct LLM.")
        try:
            system_prompt = f"You are a gaming expert for {request.game}. Use the provided context."
            user_prompt = f"QUESTION: {request.question}\n\nCONTEXT:\n{search_context}\n\nProvide a detailed answer in Markdown."
            
            res = llm.create_chat_completion(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=1024
            )
            answer = res['choices'][0]['message']['content']
            
            # Save AI message
            cursor.execute("INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)",
                           (request.session_id, "assistant", answer))
            conn.commit()
            conn.close()
            
            return {"answer": answer}
        except Exception as fallback_error:
            if conn: conn.close()
            raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
