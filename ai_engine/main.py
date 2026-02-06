"""
AI Engine FastAPI 服务
提供图像分析和语义搜索 API
"""
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
import uvicorn

from clip_model import get_model


app = FastAPI(
    title="Nexus Media AI Engine",
    description="Local AI backend for image tagging and semantic search",
    version="1.0.0"
)


# ==================== 请求/响应模型 ====================

class AnalyzeRequest(BaseModel):
    image_path: str
    top_k: int = 5
    threshold: float = 0.2


class TagResult(BaseModel):
    name: str
    confidence: float


class AnalyzeResponse(BaseModel):
    tags: list[TagResult]
    embedding: list[float]


class EmbedTextRequest(BaseModel):
    text: str


class EmbedTextResponse(BaseModel):
    embedding: list[float]


class BatchAnalyzeRequest(BaseModel):
    image_paths: list[str]
    top_k: int = 5
    threshold: float = 0.2


class BatchAnalyzeItem(BaseModel):
    path: str
    success: bool
    tags: Optional[list[TagResult]] = None
    embedding: Optional[list[float]] = None
    error: Optional[str] = None


class BatchAnalyzeResponse(BaseModel):
    results: list[BatchAnalyzeItem]


class HealthResponse(BaseModel):
    status: str
    cuda: bool
    device: str
    gpu_name: Optional[str] = None
    gpu_memory: Optional[str] = None


# ==================== API 端点 ====================

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """健康检查，返回 GPU 状态"""
    model = get_model()
    info = model.get_device_info()
    
    return HealthResponse(
        status="ok",
        cuda=info["cuda_available"],
        device=info["device"],
        gpu_name=info.get("gpu_name"),
        gpu_memory=info.get("gpu_memory_total")
    )


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze_image(request: AnalyzeRequest):
    """
    分析单张图片
    
    返回 AI 生成的标签和 512 维特征向量
    """
    model = get_model()
    
    try:
        result = model.analyze_image(
            request.image_path,
            top_k=request.top_k,
            threshold=request.threshold
        )
        return AnalyzeResponse(
            tags=[TagResult(**t) for t in result["tags"]],
            embedding=result["embedding"]
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {e}")


@app.post("/embed-text", response_model=EmbedTextResponse)
async def embed_text(request: EmbedTextRequest):
    """
    将文本转换为特征向量
    
    用于语义搜索：将用户输入转换为向量后与图片向量比对
    """
    model = get_model()
    
    try:
        embedding = model.embed_text(request.text)
        return EmbedTextResponse(embedding=embedding)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Text embedding failed: {e}")


@app.post("/batch-analyze", response_model=BatchAnalyzeResponse)
async def batch_analyze(request: BatchAnalyzeRequest):
    """
    批量分析图片
    
    适用于后台批量处理场景
    """
    model = get_model()
    
    results = model.batch_analyze(
        request.image_paths,
        top_k=request.top_k,
        threshold=request.threshold
    )
    
    items = []
    for r in results:
        if r["success"]:
            items.append(BatchAnalyzeItem(
                path=r["path"],
                success=True,
                tags=[TagResult(**t) for t in r["tags"]],
                embedding=r["embedding"]
            ))
        else:
            items.append(BatchAnalyzeItem(
                path=r["path"],
                success=False,
                error=r.get("error")
            ))
    
    return BatchAnalyzeResponse(results=items)


# ==================== 启动入口 ====================

if __name__ == "__main__":
    print("Starting AI Engine server...")
    print("Preloading CLIP model...")
    
    # 预加载模型
    model = get_model()
    _ = model.get_device_info()
    
    # 启动服务
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8765,
        log_level="info"
    )
