"""
AI 创意工作室 - 拼图生成器
支持多种布局算法和高质量图像渲染
"""
import os
from PIL import Image, ImageDraw, ImageFilter, ImageOps
import numpy as np
import math
from typing import List, Tuple, Dict, Optional
import time

class CollageMaker:
    def __init__(self, canvas_width: int = 3840, canvas_height: int = 2160, bg_color: str = "#000000"):
        """
        初始化拼图生成器
        默认输出 4K 分辨率
        """
        self.canvas_width = canvas_width
        self.canvas_height = canvas_height
        self.bg_color = bg_color
        self.margin = 40  # 外部间距
        self.spacing = 20  # 图片间距
        
    def _create_bordered_image(self, img: Image.Image, border_width: int = 10, shadow_offset: int = 8) -> Image.Image:
        """为图片添加白色边框和柔和阴影"""
        # 添加边框
        if border_width > 0:
            img = ImageOps.expand(img, border=border_width, fill='white')
            
        # 创建带阴影的画布
        shadow_blur = 15
        s_width = img.width + shadow_blur * 2
        s_height = img.height + shadow_blur * 2
        
        # 阴影层
        shadow_layer = Image.new('RGBA', (s_width, s_height), (0, 0, 0, 0))
        draw = ImageDraw.Draw(shadow_layer)
        # 绘制一个黑色矩形作为阴影基础
        shadow_box = [shadow_blur, shadow_blur, s_width - shadow_blur, s_height - shadow_blur]
        draw.rectangle(shadow_box, fill=(0, 0, 0, 100))
        # 模糊阴影
        shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(shadow_blur))
        
        # 最终组合
        final_img = Image.new('RGBA', (s_width + shadow_offset, s_height + shadow_offset), (0, 0, 0, 0))
        final_img.paste(shadow_layer, (shadow_offset, shadow_offset), shadow_layer)
        final_img.paste(img, (shadow_blur, shadow_blur))
        
        return final_img

    def generate(self, image_paths: List[str], style: str = "compact", output_path: str = None) -> str:
        """
        生成拼图
        
        Args:
            image_paths: 图片路径列表
            style: 风格 (compact, masonry, random, polaroid)
            output_path: 保存路径
        """
        if not image_paths:
            raise ValueError("No images provided for collage")

        # 限流：最多处理 50 张
        image_paths = image_paths[:50]
        
        # 创建主画布
        canvas = Image.new('RGB', (self.canvas_width, self.canvas_height), self.bg_color)
        
        if style == "masonry" or style == "compact":
            self._render_masonry(canvas, image_paths, style)
        elif style == "filmstrip":
            self._render_filmstrip(canvas, image_paths)
        else:
            self._render_grid(canvas, image_paths)
            
        if output_path:
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            canvas.save(output_path, quality=95)
            return output_path
            
        return ""

    def _render_masonry(self, canvas: Image.Image, image_paths: List[str], style: str):
        """
        瀑布流布局算法
        尝试将图片填充到水平行中，保持图片原有的长宽比
        """
        target_row_height = self.canvas_height // 4 if len(image_paths) > 10 else self.canvas_height // 3
        current_y = self.margin
        row_images = []
        row_width = 0
        
        usable_width = self.canvas_width - 2 * self.margin
        
        for path in image_paths:
            try:
                img = Image.open(path).convert("RGB")
                w, h = img.size
                aspect = w / h
                
                # 计算在标准行高下的宽度
                new_w = int(target_row_height * aspect)
                row_images.append((img, new_w, aspect))
                row_width += new_w + self.spacing
                
                # 如果当前行已接近填满
                if row_width >= usable_width:
                    # 缩放至填满一行
                    self._draw_row(canvas, row_images, current_y, usable_width)
                    current_y += target_row_height + self.spacing
                    row_images = []
                    row_width = 0
                    
                    # 检查是否超出画布高度
                    if current_y > self.canvas_height - self.margin:
                        break
            except Exception as e:
                print(f"Error loading image {path}: {e}")
                continue
        
        # 处理最后一行
        if row_images:
            self._draw_row(canvas, row_images, current_y, usable_width, stretch=False)

    def _draw_row(self, canvas, row_images, y, usable_width, stretch=True):
        """将一组图片绘制成一行"""
        if not row_images:
            return
            
        total_spacing = self.spacing * (len(row_images) - 1)
        actual_usable = usable_width - total_spacing
        
        current_x = self.margin
        
        if stretch:
            # 根据实际宽度缩放比例
            current_row_width = sum(img[1] for img in row_images)
            ratio = actual_usable / current_row_width
            
            # 使用计算出的比例统一缩放本行所有图片
            for img_obj, _, aspect in row_images:
                new_w = int(img_obj.width * (ratio * (canvas.height/4) / img_obj.height)) # 简化的比例计算
                # 重新精确计算
                new_h = int(actual_usable / sum(item[2] for item in row_images))
                new_w = int(new_h * aspect)
                
                resized_img = img_obj.resize((new_w, new_h), Image.Resampling.LANCZOS)
                # 装饰（可选边框）
                canvas.paste(resized_img, (current_x, y))
                current_x += new_w + self.spacing
        else:
            # 最后一行不拉伸
            height = row_images[0][0].height # 使用第一张图的高度
            # 缩放到标准高度
            h = canvas.height // 4
            for img_obj, _, aspect in row_images:
                new_w = int(h * aspect)
                resized_img = img_obj.resize((new_w, h), Image.Resampling.LANCZOS)
                canvas.paste(resized_img, (current_x, y))
                current_x += new_w + self.spacing

    def _render_grid(self, canvas: Image.Image, image_paths: List[str]):
        """经典平铺网格"""
        count = len(image_paths)
        cols = math.ceil(math.sqrt(count * (self.canvas_width / self.canvas_height)))
        rows = math.ceil(count / cols)
        
        cell_w = (self.canvas_width - 2 * self.margin - (cols - 1) * self.spacing) // cols
        cell_h = (self.canvas_height - 2 * self.margin - (rows - 1) * self.spacing) // rows
        
        for i, path in enumerate(image_paths):
            try:
                img = Image.open(path).convert("RGB")
                img = ImageOps.fit(img, (cell_w, cell_h), Image.Resampling.LANCZOS)
                
                r, c = i // cols, i % cols
                x = self.margin + c * (cell_w + self.spacing)
                y = self.margin + r * (cell_h + self.spacing)
                
                canvas.paste(img, (x, y))
            except Exception:
                continue

    def _render_filmstrip(self, canvas: Image.Image, image_paths: List[str]):
        """电影底片条带风格"""
        # 居中垂直放置
        strip_height = self.canvas_height // 2
        y = (self.canvas_height - strip_height) // 2
        current_x = self.margin
        
        for path in image_paths:
            try:
                img = Image.open(path).convert("RGB")
                aspect = img.width / img.height
                new_w = int(strip_height * aspect)
                
                img = img.resize((new_w, strip_height), Image.Resampling.LANCZOS)
                
                # 绘制模拟底片边框
                # 这里可以扩展更复杂的绘制效果
                canvas.paste(img, (current_x, y))
                
                current_x += new_w + self.spacing
                if current_x > self.canvas_width - self.margin:
                    break
            except Exception:
                continue

