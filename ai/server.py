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

def web_search(query: str):
    """
    Search the web for real-time information about games, achievements, mechanics, or locations.
    Use this when you need current data from wikis or walkthroughs.
    """
    from ddgs import DDGS
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=5))
            if not results:
                return "No results found."
            return "\n\n".join([f"Source: {r['title']}\n{r['body']}" for r in results])
    except Exception as e:
        return f"Search error: {e}"

class GuideRequest(BaseModel):
    game: str
    achievement: str

@app.post("/generate_guide")
def generate_guide(request: GuideRequest):
    if not llm:
        raise HTTPException(status_code=503, detail="Model not loaded. Brain is still initializing.")
    
    print(f"[AI Server] Generating guide for: {request.game} - {request.achievement}")
    
    try:
        # Agent with explicit Task
        from praisonaiagents import Agent, Task
        
        port = int(os.getenv("PORT", 8000))
        os.environ["OPENAI_BASE_URL"] = f"http://localhost:{port}/v1"
        os.environ["OPENAI_API_KEY"] = "not-needed"
        os.environ["OPENAI_MODEL_NAME"] = "local-model"
        
        guide_task = Task(
            description=f"Research and write a professional tactical guide for '{request.achievement}' in '{request.game}'. Use tools to find latest wiki data.",
            expected_output="A complete step-by-step guide in Markdown format with headers and bold text.",
            name="generate_guide"
        )

        guide_agent = Agent(
            name="Tactical Specialist",
            role="Gaming Expert",
            goal=f"Provide high-quality tactical advice for {request.game}.",
            backstory="You synthesize wiki data into actionable steps. You search when you need more data.",
            model="openai/local-model",
            tools=[web_search],
            tasks=[guide_task]
        )
        guide_agent.verbose = True
        
        print(f"[AI Server] Starting Agentic Synthesis...")
        # PraisonAI Agents usually run via start() which processes their tasks
        result = guide_agent.start()
        print(f"DEBUG: Raw result object: {result}")
        
        # Extract content from result
        guide_content = ""
        if hasattr(result, 'content'):
            guide_content = result.content
        elif isinstance(result, str):
            guide_content = result
        else:
            guide_content = str(result)
            
        if not guide_content.strip():
            print("[AI Server] Agent returned empty content. Attempting raw result extraction...")
            # Some versions return a list of task results
            if isinstance(result, list) and len(result) > 0:
                guide_content = str(result[0])

        return {"guide": guide_content}
        
    except Exception as e:
        print(f"[AI Server] Agent failed: {e}. Falling back to direct LLM.")
        try:
            # Fallback (manual search for fallback still okay)
            search_context = web_search(f"{request.game} {request.achievement} guide")
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

@app.delete("/expert/sessions/{session_id}")
def delete_session(session_id: str):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM messages WHERE session_id = ?", (session_id,))
        cursor.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
    return {"status": "ok"}

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

    try:
        # 2. Use the Agent with explicit Task
        from praisonaiagents import Agent, Task
        
        port = int(os.getenv("PORT", 8000))
        os.environ["OPENAI_BASE_URL"] = f"http://localhost:{port}/v1"
        os.environ["OPENAI_API_KEY"] = "not-needed"
        os.environ["OPENAI_MODEL_NAME"] = "local-model"
        
        expert_task = Task(
            description=f"Answer the user's question about the game '{request.game}'. Question: {request.question}",
            expected_output="A detailed tactical answer in Markdown with headers and bold text.",
            name="expert_query"
        )

        agent = Agent(
            name="Combat Intelligence",
            role="Tactical Expert",
            goal=f"Solve the user's inquiry about {request.game}.",
            backstory="You are a data-driven gaming strategist. You search for wiki data when needed.",
            model="openai/local-model",
            tools=[web_search],
            tasks=[expert_task]
        )
        agent.verbose = True
        
        print(f"[AI Server] Starting Expert Analysis...")
        result = agent.start()
        print(f"DEBUG: Raw expert result object: {result}")
        
        # Extract content
        answer_text = ""
        if hasattr(result, 'content'):
            answer_text = result.content
        elif isinstance(result, str):
            answer_text = result
        else:
            answer_text = str(result)
            
        if not answer_text.strip() and isinstance(result, list) and len(result) > 0:
            answer_text = str(result[0])
            
        if not answer_text.strip():
            print("[AI Server] Warning: Empty answer returned from expert agent.")
        
        # Save AI message
        cursor.execute("INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)",
                       (request.session_id, "assistant", answer_text))
        conn.commit()
        conn.close()
        
        return {"answer": answer_text}
        
    except Exception as e:
        print(f"[AI Server] Expert failed: {e}. Falling back to direct LLM.")
        try:
            # Fallback search
            search_context = web_search(f"{request.game} {request.question}")
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
