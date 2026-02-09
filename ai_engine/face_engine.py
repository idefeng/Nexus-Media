import cv2
import numpy as np
from insightface.app import FaceAnalysis
import torch
import os
import uuid

class FaceEngine:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(FaceEngine, cls).__new__(cls)
            cls._instance.initialized = False
        return cls._instance

    def __init__(self):
        if self.initialized:
            return
        
        # 默认使用 buffalo_l 模型
        # providers 可以根据 GPU 支持情况调整，RTX 4060 支持 CUDA
        # ctx_id: GPU ID, 0 表示第一个 GPU, -1 表示 CPU
        ctx_id = 0 if torch.cuda.is_available() else -1
        
        self.app = FaceAnalysis(name='buffalo_l')
        self.app.prepare(ctx_id=ctx_id, det_size=(640, 640))
        self.initialized = True
        print(f"FaceEngine initialized on {'GPU' if ctx_id >= 0 else 'CPU'}")

    def detect_faces(self, image_path: str, save_dir: str = None):
        """
        检测图片中的人脸并提取特征
        """
        # Fix for Chinese paths on Windows
        import numpy as np
        try:
            img = cv2.imdecode(np.fromfile(image_path, dtype=np.uint8), cv2.IMREAD_COLOR)
        except Exception as e:
            img = None
            
        if img is None:
            raise ValueError(f"Could not read image: {image_path}")
        
        faces = self.app.get(img)
        
        results = []
        for face in faces:
            # 提取信息
            bbox = face.bbox.astype(int).tolist() # [x1, y1, x2, y2]
            embedding = face.embedding.tolist()    # 512D
            confidence = float(face.det_score)
            gender = "M" if face.gender == 1 else "F"
            age = int(face.age)
            
            thumb_path = None
            if save_dir:
                # 扣取人脸缩略图 (带一点 margin)
                x1, y1, x2, y2 = bbox
                h, w = img.shape[:2]
                margin = int((x2 - x1) * 0.2)
                nx1 = max(0, x1 - margin)
                ny1 = max(0, y1 - margin)
                nx2 = min(w, x2 + margin)
                ny2 = min(h, y2 + margin)
                
                face_img = img[ny1:ny2, nx1:nx2]
                if face_img.size > 0:
                    face_id = str(uuid.uuid4())
                    thumb_path = os.path.join(save_dir, f"{face_id}.jpg")
                    cv2.imwrite(thumb_path, face_img)
            
            results.append({
                "bbox": bbox,
                "embedding": embedding,
                "confidence": confidence,
                "gender": gender,
                "age": age,
                "thumbnail_path": thumb_path
            })
            
        return results

    def cluster_faces(self, embeddings, threshold=0.6):
        """
        使用 DBSCAN 对人脸特征进行聚类
        注意：embeddings 应该是 (N, 512) 的 numpy 数组
        """
        from sklearn.cluster import DBSCAN
        from sklearn.preprocessing import normalize
        
        if len(embeddings) == 0:
            return []
            
        # 归一化特征向量
        embeddings = normalize(np.array(embeddings))
        
        # DBSCAN 聚类
        # eps 是邻域半径，对于归一化后的余弦距离，通常在 0.4-0.6 之间
        # metric='cosine' 直接计算余弦相似度
        clustering = DBSCAN(eps=threshold, min_samples=1, metric='cosine').fit(embeddings)
        
        return clustering.labels_.tolist()

def get_face_engine():
    return FaceEngine()
