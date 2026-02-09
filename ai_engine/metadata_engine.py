import os
import cv2
from PIL import Image, ExifTags
from datetime import datetime
from typing import Dict, Any, Optional

class MetadataEngine:
    def __init__(self):
        pass

    def extract_metadata(self, file_path: str) -> Dict[str, Any]:
        """
        Extract metadata from file.
        Returns a dict matching the ExifData interface in Electron.
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        ext = os.path.splitext(file_path)[1].lower()
        if ext in ['.jpg', '.jpeg', '.png', '.webp', '.tiff']:
            return self._extract_image_exif(file_path)
        elif ext in ['.mp4', '.mov', '.avi', '.mkv']:
            return self._extract_video_metadata(file_path)
        else:
            return {}

    def _extract_image_exif(self, image_path: str) -> Dict[str, Any]:
        data = {
            "fileSize": os.path.getsize(image_path),
            "mimeType": "image/jpeg" # simplified
        }
        
        try:
            with Image.open(image_path) as img:
                data["width"] = img.width
                data["height"] = img.height
                data["mimeType"] = img.get_format_mimetype() or "image/jpeg"
                
                exif = img._getexif()
                if not exif:
                    return data
                
                # Tag mapping
                # See: https://exiv2.org/tags.html
                for tag_id, value in exif.items():
                    tag_name = ExifTags.TAGS.get(tag_id, tag_id)
                    
                    if tag_name == 'Make': data['make'] = str(value)
                    elif tag_name == 'Model': data['model'] = str(value)
                    elif tag_name == 'Software': data['software'] = str(value)
                    elif tag_name == 'BodySerialNumber': data['serialNumber'] = str(value)
                    elif tag_name == 'LensModel': data['lensModel'] = str(value)
                    
                    # Exposure
                    elif tag_name == 'FNumber': data['aperture'] = float(value) if value else None
                    elif tag_name == 'ExposureTime': data['exposureTime'] = str(value)
                    elif tag_name == 'ISOSpeedRatings': data['iso'] = int(value)
                    elif tag_name == 'FocalLength': data['focalLength'] = str(value)
                    elif tag_name == 'Flash': data['flash'] = str(value)
                    elif tag_name == 'WhiteBalance': data['whiteBalance'] = str(value)
                    
                    # Date
                    elif tag_name == 'DateTimeOriginal': data['dateTimeOriginal'] = self._parse_date(value)
                    elif tag_name == 'DateTimeDigitized': data['createDate'] = self._parse_date(value)
                    elif tag_name == 'DateTime': data['modifyDate'] = self._parse_date(value)
                    
                    # GPS
                    elif tag_name == 'GPSInfo':
                        lat, lon, alt = self._parse_gps(value)
                        if lat is not None: data['latitude'] = lat
                        if lon is not None: data['longitude'] = lon
                        if alt is not None: data['altitude'] = alt

        except Exception as e:
            print(f"Metadata extraction error for {image_path}: {e}")
            
        return data

    def _extract_video_metadata(self, video_path: str) -> Dict[str, Any]:
        data = {
            "fileSize": os.path.getsize(video_path),
            "mimeType": "video/mp4" # generic
        }
        
        try:
            cap = cv2.VideoCapture(video_path)
            if cap.isOpened():
                data['width'] = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                data['height'] = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                data['duration'] = cap.get(cv2.CAP_PROP_FRAME_COUNT) / (cap.get(cv2.CAP_PROP_FPS) or 1.0)
            cap.release()
        except Exception as e:
            print(f"Video metadata error for {video_path}: {e}")
            
        # Basic file times as fallback
        try:
            stat = os.stat(video_path)
            data['modifyDate'] = datetime.fromtimestamp(stat.st_mtime).isoformat()
            data['createDate'] = datetime.fromtimestamp(stat.st_ctime).isoformat()
        except:
            pass
            
        return data

    def _parse_date(self, date_str):
        # EXIF date format: "YYYY:MM:DD HH:MM:SS"
        try:
            return datetime.strptime(str(date_str), '%Y:%m:%d %H:%M:%S').isoformat()
        except:
            return str(date_str)

    def _parse_gps(self, gps_info):
        """
        Parse GPSInfo tags.
        Returns (lat, lon, alt)
        """
        def convert_to_degrees(value):
            try:
                d = float(value[0])
                m = float(value[1])
                s = float(value[2])
                return d + (m / 60.0) + (s / 3600.0)
            except:
                return 0.0

        lat = None
        lon = None
        alt = None

        try:
            # GPSLatitudeRef (1)
            # GPSLatitude (2)
            # GPSLongitudeRef (3)
            # GPSLongitude (4)
            # GPSAltitude (6)
            
            if 2 in gps_info and 4 in gps_info:
                lat = convert_to_degrees(gps_info[2])
                lon = convert_to_degrees(gps_info[4])
                
                if 1 in gps_info and gps_info[1] == 'S': lat = -lat
                if 3 in gps_info and gps_info[3] == 'W': lon = -lon
                
            if 6 in gps_info:
                try:
                    alt = float(gps_info[6])
                except:
                    pass
                    
        except Exception as e:
            print(f"GPS parse error: {e}")
            
        return lat, lon, alt
