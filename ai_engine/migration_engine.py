import os
import cv2
import math
import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
from PIL import Image, ExifTags
from face_engine import get_face_engine

class MigrationEngine:
    def __init__(self):
        self.face_engine = get_face_engine()

    def _get_exif_data(self, image_path: str) -> Dict:
        """Extract simplified EXIF data (DateTime, GPS)"""
        exif_data = {
            "datetime": None,
            "gps": None  # (lat, lon)
        }
        
        try:
            img = Image.open(image_path)
            exif = img._getexif()
            if not exif:
                return exif_data
                
            # Parse tags
            for tag, value in exif.items():
                tag_name = ExifTags.TAGS.get(tag, tag)
                
                # DateTime
                if tag_name == 'DateTimeOriginal' or tag_name == 'DateTime':
                    try:
                        # Standard EXIF format: YYYY:MM:DD HH:MM:SS
                        exif_data["datetime"] = datetime.strptime(value, '%Y:%m:%d %H:%M:%S')
                    except:
                        pass
                
                # GPS
                if tag_name == 'GPSInfo':
                    gps_info = value
                    exif_data["gps"] = self._parse_gps(gps_info)
                    
        except Exception as e:
            print(f"Error reading EXIF for {image_path}: {e}")
            
        return exif_data

    def _parse_gps(self, gps_info) -> Optional[Tuple[float, float]]:
        """Convert GPSInfo to decimal degrees"""
        def convert_to_degrees(value):
            d = float(value[0])
            m = float(value[1])
            s = float(value[2])
            return d + (m / 60.0) + (s / 3600.0)

        try:
            lat = None
            lon = None
            
            # 2: Latitude, 4: Longitude, 1: N/S, 3: E/W
            if 2 in gps_info and 4 in gps_info:
                lat = convert_to_degrees(gps_info[2])
                lon = convert_to_degrees(gps_info[4])
                
                if gps_info[1] == 'S': lat = -lat
                if gps_info[3] == 'W': lon = -lon
                
                return (lat, lon)
        except:
            pass
        return None

    def _haversine_distance(self, coord1, coord2):
        """Calculate distance in meters between two coordinates"""
        if not coord1 or not coord2:
            return float('inf')
            
        R = 6371000  # Radius of Earth in meters
        lat1, lon1 = math.radians(coord1[0]), math.radians(coord1[1])
        lat2, lon2 = math.radians(coord2[0]), math.radians(coord2[1])
        
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        
        a = math.sin(dlat / 2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        
        return R * c

    def get_face_embeddings(self, image_path: str) -> List[List[float]]:
        """Get embeddings for all faces in an image"""
        try:
            results = self.face_engine.detect_faces(image_path)
            return [r['embedding'] for r in results]
        except Exception as e:
            print(f"Face detect error: {e}")
            return []

    def analyze_seed(self, image_path: str) -> Dict:
        """Analyze seed image to get criteria baselines"""
        exif = self._get_exif_data(image_path)
        faces = self.get_face_embeddings(image_path)
        
        return {
            "path": image_path,
            "datetime": exif["datetime"],
            "gps": exif["gps"],
            "face_embeddings": faces,
            "face_count": len(faces)
        }

    def compare_batch(self, seed_info: Dict, target_paths: List[str], criteria: Dict) -> List[Dict]:
        """
        Compare a batch of images against seed info.
        criteria: {
            "time": bool,       # Match within 24h
            "location": bool,   # Match within 500m
            "face": bool        # Match any face > 0.6 similarity
        }
        """
        results = []
        seed_time = seed_info.get("datetime")
        seed_gps = seed_info.get("gps")
        seed_faces = seed_info.get("face_embeddings", [])
        
        # Thresholds
        TIME_THRESHOLD_HOURS = 24
        DIST_THRESHOLD_METERS = 500
        FACE_THRESHOLD = 0.6

        for path in target_paths:
            match_reasons = []
            confidence_score = 0
            
            # Skip if same file
            if os.path.normpath(path) == os.path.normpath(seed_info["path"]):
                continue

            # 1. Analyze Target
            target_exif = self._get_exif_data(path)
            
            # --- Time Comparison ---
            if criteria.get("time"):
                if seed_time and target_exif["datetime"]:
                    delta = abs(target_exif["datetime"] - seed_time)
                    if delta <= timedelta(hours=TIME_THRESHOLD_HOURS):
                        match_reasons.append(f"Time match ({int(delta.total_seconds()/3600)}h diff)")
                        confidence_score += 1
                elif not target_exif["datetime"]:
                    pass # Cannot match if no date

            # --- Location Comparison ---
            if criteria.get("location"):
                if seed_gps and target_exif["gps"]:
                    dist = self._haversine_distance(seed_gps, target_exif["gps"])
                    if dist <= DIST_THRESHOLD_METERS:
                        match_reasons.append(f"Location match ({int(dist)}m)")
                        confidence_score += 1

            # --- Face Comparison ---
            if criteria.get("face") and seed_faces:
                # Only pay the cost of face detection if we need it
                # Optimization: Maybe only check faces if other criteria matched or if face is the ONLY criteria?
                # For now, we check if requested.
                target_faces = self.get_face_embeddings(path)
                match_found = False
                
                # Compare every seed face with every target face
                if target_faces:
                    for sf in seed_faces:
                        for tf in target_faces:
                            # Cosine Similarity
                            sf_np = np.array(sf)
                            tf_np = np.array(tf)
                            norm_sf = np.linalg.norm(sf_np)
                            norm_tf = np.linalg.norm(tf_np)
                            
                            if norm_sf > 0 and norm_tf > 0:
                                sim = np.dot(sf_np, tf_np) / (norm_sf * norm_tf)
                                if sim > FACE_THRESHOLD:
                                    match_found = True
                                    match_reasons.append(f"Face match ({sim:.2f})")
                                    confidence_score += 1
                                    break
                        if match_found: break
            
            # Determine Result
            if match_reasons:
                results.append({
                    "path": path,
                    "confidence_level": "High" if confidence_score >= sum(1 for v in criteria.values() if v) else "Medium",
                    "reasons": match_reasons,
                    "score": confidence_score
                })
                
        return results
