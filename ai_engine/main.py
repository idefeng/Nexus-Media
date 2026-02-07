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


class FocusScoreRequest(BaseModel):
    image_path: str


class FocusScoreResponse(BaseModel):
    focus_score: float
    is_blurry: bool
    brightness: float
    is_too_dark: bool
    is_too_bright: bool


class BatchFocusRequest(BaseModel):
    image_paths: list[str]


class BatchFocusItem(BaseModel):
    path: str
    success: bool
    focus_score: Optional[float] = None
    is_blurry: Optional[bool] = None
    brightness: Optional[float] = None
    error: Optional[str] = None


class BatchFocusResponse(BaseModel):
    results: list[BatchFocusItem]


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


# ==================== 图片质量检测 ====================

def calculate_focus_score(image_path: str) -> dict:
    """
    使用 Laplacian 算子计算图片清晰度
    返回 focus_score (方差) 和亮度信息
    """
    import cv2
    import numpy as np
    
    # 读取图片
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"无法读取图片: {image_path}")
    
    # 转换为灰度图
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # 计算 Laplacian 方差 (focus score)
    laplacian = cv2.Laplacian(gray, cv2.CV_64F)
    focus_score = laplacian.var()
    
    # 计算亮度 (平均像素值)
    brightness = np.mean(gray)
    
    # 判断是否模糊 (阈值 100)
    is_blurry = focus_score < 100
    
    # 判断曝光问题 (正常范围 50-200)
    is_too_dark = brightness < 50
    is_too_bright = brightness > 200
    
    return {
        "focus_score": float(focus_score),
        "is_blurry": is_blurry,
        "brightness": float(brightness),
        "is_too_dark": is_too_dark,
        "is_too_bright": is_too_bright
    }


@app.post("/focus-score", response_model=FocusScoreResponse)
async def get_focus_score(request: FocusScoreRequest):
    """
    计算单张图片的清晰度评分
    
    使用 Laplacian 算子计算方差，值越高越清晰
    """
    try:
        result = calculate_focus_score(request.image_path)
        return FocusScoreResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Focus score calculation failed: {e}")


@app.post("/batch-focus-score", response_model=BatchFocusResponse)
async def batch_focus_score(request: BatchFocusRequest):
    """
    批量计算图片清晰度评分
    """
    results = []
    
    for path in request.image_paths:
        try:
            result = calculate_focus_score(path)
            results.append(BatchFocusItem(
                path=path,
                success=True,
                focus_score=result["focus_score"],
                is_blurry=result["is_blurry"],
                brightness=result["brightness"]
            ))
        except Exception as e:
            results.append(BatchFocusItem(
                path=path,
                success=False,
                error=str(e)
            ))
    
    return BatchFocusResponse(results=results)


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

