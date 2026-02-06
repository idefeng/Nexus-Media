"""
CLIP 模型封装
支持 GPU 加速的图像特征提取和标签预测
"""
import torch
import open_clip
from PIL import Image
import numpy as np
from pathlib import Path
from typing import Optional

# 预定义标签词库 - 用于零样本分类
PREDEFINED_TAGS = [
    # 中文标签
    "风景", "人物", "宠物", "动物", "建筑", "美食", "夜景",
    "海滩", "森林", "城市", "自然", "肖像", "街拍", "微距",
    "日落", "天空", "水", "山", "花", "树", "雪", "雨",
    "室内", "户外", "黑白", "复古", "现代", "艺术",
    # English tags
    "landscape", "portrait", "pet", "animal", "architecture",
    "food", "night", "beach", "forest", "city", "nature",
    "street", "macro", "sunset", "sky", "water", "mountain",
    "flower", "tree", "snow", "rain", "indoor", "outdoor",
    "black and white", "vintage", "modern", "art", "selfie",
    "group photo", "travel", "sports", "wedding", "birthday"
]


class ClipModel:
    """CLIP 模型封装类"""
    
    def __init__(self, model_name: str = "ViT-B-32", pretrained: str = "openai"):
        """
        初始化 CLIP 模型
        
        Args:
            model_name: 模型架构 (ViT-B-32 较快，ViT-L-14 更准)
            pretrained: 预训练权重来源
        """
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model_name = model_name
        self.pretrained = pretrained
        
        # 延迟加载模型
        self._model = None
        self._preprocess = None
        self._tokenizer = None
        self._tag_features = None
    
    def _load_model(self):
        """延迟加载模型到 GPU"""
        if self._model is not None:
            return
        
        print(f"Loading CLIP model {self.model_name} on {self.device}...")
        self._model, _, self._preprocess = open_clip.create_model_and_transforms(
            self.model_name, 
            pretrained=self.pretrained,
            device=self.device
        )
        self._tokenizer = open_clip.get_tokenizer(self.model_name)
        self._model.eval()
        
        # 预计算标签特征向量
        self._precompute_tag_features()
        print(f"Model loaded successfully. CUDA: {self.is_cuda_available()}")
    
    def _precompute_tag_features(self):
        """预计算所有标签的特征向量"""
        with torch.no_grad():
            text_tokens = self._tokenizer(PREDEFINED_TAGS).to(self.device)
            self._tag_features = self._model.encode_text(text_tokens)
            self._tag_features /= self._tag_features.norm(dim=-1, keepdim=True)
    
    def is_cuda_available(self) -> bool:
        """检查 CUDA 是否可用"""
        return torch.cuda.is_available()
    
    def get_device_info(self) -> dict:
        """获取设备信息"""
        info = {
            "device": self.device,
            "cuda_available": torch.cuda.is_available(),
        }
        if torch.cuda.is_available():
            info["gpu_name"] = torch.cuda.get_device_name(0)
            info["gpu_memory_total"] = f"{torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB"
        return info
    
    def analyze_image(self, image_path: str, top_k: int = 5, threshold: float = 0.2) -> dict:
        """
        分析图片，返回标签和特征向量
        
        Args:
            image_path: 图片路径
            top_k: 返回前 K 个最匹配的标签
            threshold: 相似度阈值，低于此值的标签不返回
            
        Returns:
            {
                "tags": [{"name": "风景", "confidence": 0.85}, ...],
                "embedding": [float, ...]  # 512维向量
            }
        """
        self._load_model()
        
        try:
            image = Image.open(image_path).convert("RGB")
            image_tensor = self._preprocess(image).unsqueeze(0).to(self.device)
        except Exception as e:
            raise ValueError(f"Failed to load image: {e}")
        
        with torch.no_grad():
            # 提取图像特征
            image_features = self._model.encode_image(image_tensor)
            image_features /= image_features.norm(dim=-1, keepdim=True)
            
            # 计算与标签的相似度
            similarities = (image_features @ self._tag_features.T).squeeze(0)
            
            # 获取 top-k 标签
            values, indices = similarities.topk(min(top_k, len(PREDEFINED_TAGS)))
            
            tags = []
            for val, idx in zip(values.cpu().numpy(), indices.cpu().numpy()):
                if val >= threshold:
                    tags.append({
                        "name": PREDEFINED_TAGS[idx],
                        "confidence": round(float(val), 3)
                    })
            
            # 返回特征向量 (512维)
            embedding = image_features.squeeze(0).cpu().numpy().tolist()
        
        return {
            "tags": tags,
            "embedding": embedding
        }
    
    def embed_text(self, text: str) -> list[float]:
        """
        将文本转换为特征向量（用于语义搜索）
        
        Args:
            text: 搜索文本
            
        Returns:
            512维特征向量
        """
        self._load_model()
        
        with torch.no_grad():
            tokens = self._tokenizer([text]).to(self.device)
            text_features = self._model.encode_text(tokens)
            text_features /= text_features.norm(dim=-1, keepdim=True)
            
        return text_features.squeeze(0).cpu().numpy().tolist()
    
    def batch_analyze(self, image_paths: list[str], top_k: int = 5, threshold: float = 0.2) -> list[dict]:
        """
        批量分析图片
        
        Args:
            image_paths: 图片路径列表
            top_k: 每张图片返回的最大标签数
            threshold: 相似度阈值
            
        Returns:
            分析结果列表
        """
        results = []
        for path in image_paths:
            try:
                result = self.analyze_image(path, top_k, threshold)
                result["path"] = path
                result["success"] = True
            except Exception as e:
                result = {
                    "path": path,
                    "success": False,
                    "error": str(e)
                }
            results.append(result)
        return results


# 单例模式
_model_instance: Optional[ClipModel] = None


def get_model() -> ClipModel:
    """获取模型单例"""
    global _model_instance
    if _model_instance is None:
        _model_instance = ClipModel()
    return _model_instance
