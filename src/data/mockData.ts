/**
 * Mock 数据 - 模拟媒体资源
 * 使用 Unsplash 的随机图片作为演示
 */
import { MediaItem, TagStat } from '../types'

// 模拟媒体资源数据
export const mockMediaItems: MediaItem[] = [
    {
        id: 1,
        path: '/images/landscape_01.jpg',
        type: 'image',
        tags: ['风景', '自然', '山脉'],
        notes: '阿尔卑斯山日落景色',
        thumbnailPath: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop',
        fileName: 'landscape_01.jpg',
        fileSize: 2457600,
        ext: 'jpg',
        width: 1920,
        height: 1080,
        duration: null,
        birthTime: '2026-02-05T10:30:00Z',
        modifiedTime: '2026-02-05T10:30:00Z',
        createdAt: '2026-02-05T10:30:00Z',
        updatedAt: '2026-02-05T10:30:00Z',
        isFavorite: true
    },
    {
        id: 2,
        path: '/images/city_night.jpg',
        type: 'image',
        tags: ['城市', '夜景', '建筑'],
        notes: '东京塔夜景',
        thumbnailPath: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&h=300&fit=crop',
        fileName: 'city_night.jpg',
        fileSize: 3145728,
        ext: 'jpg',
        width: 1920,
        height: 1280,
        duration: null,
        birthTime: '2026-02-04T08:15:00Z',
        modifiedTime: '2026-02-04T08:15:00Z',
        createdAt: '2026-02-04T08:15:00Z',
        updatedAt: '2026-02-04T08:15:00Z',
        isFavorite: false
    },
    {
        id: 3,
        path: '/videos/ocean_waves.mp4',
        type: 'video',
        tags: ['海洋', '自然', '放松'],
        notes: '马尔代夫海浪视频',
        thumbnailPath: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=400&h=300&fit=crop',
        fileName: 'ocean_waves.mp4',
        fileSize: 52428800,
        ext: 'mp4',
        width: 1920,
        height: 1080,
        duration: 120,
        birthTime: '2026-02-03T14:20:00Z',
        modifiedTime: '2026-02-03T14:20:00Z',
        createdAt: '2026-02-03T14:20:00Z',
        updatedAt: '2026-02-03T14:20:00Z',
        isFavorite: true
    },
    {
        id: 4,
        path: '/images/portrait_01.jpg',
        type: 'image',
        tags: ['人像', '摄影', '艺术'],
        notes: '街头人像摄影',
        thumbnailPath: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=300&fit=crop',
        fileName: 'portrait_01.jpg',
        fileSize: 1835008,
        ext: 'jpg',
        width: 1200,
        height: 1600,
        duration: null,
        birthTime: '2026-02-02T16:45:00Z',
        modifiedTime: '2026-02-02T16:45:00Z',
        createdAt: '2026-02-02T16:45:00Z',
        updatedAt: '2026-02-02T16:45:00Z',
        isFavorite: false
    },
    {
        id: 5,
        path: '/images/tech_abstract.jpg',
        type: 'image',
        tags: ['科技', '抽象', '设计'],
        notes: '科技感抽象背景',
        thumbnailPath: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=300&fit=crop',
        fileName: 'tech_abstract.jpg',
        fileSize: 2097152,
        ext: 'jpg',
        width: 1920,
        height: 1080,
        duration: null,
        birthTime: '2026-02-01T11:00:00Z',
        modifiedTime: '2026-02-01T11:00:00Z',
        createdAt: '2026-02-01T11:00:00Z',
        updatedAt: '2026-02-01T11:00:00Z',
        isFavorite: true
    },
    {
        id: 6,
        path: '/videos/drone_footage.mp4',
        type: 'video',
        tags: ['航拍', '风景', '4K'],
        notes: '冰岛航拍素材',
        thumbnailPath: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=400&h=300&fit=crop',
        fileName: 'drone_footage.mp4',
        fileSize: 157286400,
        ext: 'mp4',
        width: 3840,
        height: 2160,
        duration: 180,
        birthTime: '2026-01-30T09:30:00Z',
        modifiedTime: '2026-01-30T09:30:00Z',
        createdAt: '2026-01-30T09:30:00Z',
        updatedAt: '2026-01-30T09:30:00Z',
        isFavorite: false
    },
    {
        id: 7,
        path: '/images/food_photo.jpg',
        type: 'image',
        tags: ['美食', '摄影', '生活'],
        notes: '日式料理特写',
        thumbnailPath: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400&h=300&fit=crop',
        fileName: 'food_photo.jpg',
        fileSize: 1572864,
        ext: 'jpg',
        width: 1600,
        height: 1200,
        duration: null,
        birthTime: '2026-01-28T13:15:00Z',
        modifiedTime: '2026-01-28T13:15:00Z',
        createdAt: '2026-01-28T13:15:00Z',
        updatedAt: '2026-01-28T13:15:00Z',
        isFavorite: false
    },
    {
        id: 8,
        path: '/images/aurora.jpg',
        type: 'image',
        tags: ['极光', '自然', '夜景'],
        notes: '挪威北极光',
        thumbnailPath: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=400&h=300&fit=crop',
        fileName: 'aurora.jpg',
        fileSize: 2621440,
        ext: 'jpg',
        width: 1920,
        height: 1280,
        duration: null,
        birthTime: '2026-01-25T22:00:00Z',
        modifiedTime: '2026-01-25T22:00:00Z',
        createdAt: '2026-01-25T22:00:00Z',
        updatedAt: '2026-01-25T22:00:00Z',
        isFavorite: true
    },
    {
        id: 9,
        path: '/videos/timelapse.mp4',
        type: 'video',
        tags: ['延时', '城市', '夜景'],
        notes: '上海延时摄影',
        thumbnailPath: 'https://images.unsplash.com/photo-1474181487882-5abf3f0ba6c2?w=400&h=300&fit=crop',
        fileName: 'timelapse.mp4',
        fileSize: 104857600,
        ext: 'mp4',
        width: 1920,
        height: 1080,
        duration: 60,
        birthTime: '2026-01-22T19:45:00Z',
        modifiedTime: '2026-01-22T19:45:00Z',
        createdAt: '2026-01-22T19:45:00Z',
        updatedAt: '2026-01-22T19:45:00Z',
        isFavorite: false
    },
    {
        id: 10,
        path: '/images/minimal_desk.jpg',
        type: 'image',
        tags: ['极简', '工作空间', '设计'],
        notes: '极简工作台布置',
        thumbnailPath: 'https://images.unsplash.com/photo-1593062096033-9a26b09da705?w=400&h=300&fit=crop',
        fileName: 'minimal_desk.jpg',
        fileSize: 1310720,
        ext: 'jpg',
        width: 1600,
        height: 1067,
        duration: null,
        birthTime: '2026-01-20T10:00:00Z',
        modifiedTime: '2026-01-20T10:00:00Z',
        createdAt: '2026-01-20T10:00:00Z',
        updatedAt: '2026-01-20T10:00:00Z',
        isFavorite: false
    },
    {
        id: 11,
        path: '/images/forest_path.jpg',
        type: 'image',
        tags: ['森林', '自然', '道路'],
        notes: '迷雾森林小径',
        thumbnailPath: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=400&h=300&fit=crop',
        fileName: 'forest_path.jpg',
        fileSize: 2883584,
        ext: 'jpg',
        width: 1920,
        height: 1280,
        duration: null,
        birthTime: '2026-01-18T07:30:00Z',
        modifiedTime: '2026-01-18T07:30:00Z',
        createdAt: '2026-01-18T07:30:00Z',
        updatedAt: '2026-01-18T07:30:00Z',
        isFavorite: true
    },
    {
        id: 12,
        path: '/images/neon_street.jpg',
        type: 'image',
        tags: ['霓虹', '城市', '夜景'],
        notes: '赛博朋克风街道',
        thumbnailPath: 'https://images.unsplash.com/photo-1545486332-9e0999c535b2?w=400&h=300&fit=crop',
        fileName: 'neon_street.jpg',
        fileSize: 2097152,
        ext: 'jpg',
        width: 1920,
        height: 1080,
        duration: null,
        birthTime: '2026-01-15T21:15:00Z',
        modifiedTime: '2026-01-15T21:15:00Z',
        createdAt: '2026-01-15T21:15:00Z',
        updatedAt: '2026-01-15T21:15:00Z',
        isFavorite: true
    }
]

// 标签统计数据
export const mockTagStats: TagStat[] = [
    { name: '自然', count: 4 },
    { name: '夜景', count: 4 },
    { name: '城市', count: 3 },
    { name: '风景', count: 2 },
    { name: '摄影', count: 2 },
    { name: '设计', count: 2 },
    { name: '建筑', count: 1 },
    { name: '人像', count: 1 },
    { name: '美食', count: 1 },
    { name: '极光', count: 1 },
    { name: '航拍', count: 1 },
    { name: '4K', count: 1 },
    { name: '霓虹', count: 1 },
    { name: '极简', count: 1 }
]

// 辅助函数：格式化文件大小
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

// 辅助函数：格式化时长
export function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
}

// 辅助函数：格式化日期
export function formatDate(dateStr: string): string {
    const date = new Date(dateStr)
    return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    })
}
