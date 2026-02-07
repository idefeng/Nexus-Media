import { useRef, useEffect, useState } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { Loader2 } from 'lucide-react'

interface RelationshipGraphProps {
    onLinkClick?: (sourceId: number, targetId: number) => void
}

export function RelationshipGraph({ onLinkClick }: RelationshipGraphProps) {
    const graphRef = useRef<any>()
    const [graphData, setGraphData] = useState<{ nodes: any[], links: any[] }>({ nodes: [], links: [] })
    const [loading, setLoading] = useState(true)
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 })

    useEffect(() => {
        const updateDimensions = () => {
            const container = document.getElementById('graph-container')
            if (container) {
                setDimensions({
                    width: container.clientWidth,
                    height: container.clientHeight
                })
            }
        }

        window.addEventListener('resize', updateDimensions)
        updateDimensions()
        loadGraph()

        return () => window.removeEventListener('resize', updateDimensions)
    }, [])

    const loadGraph = async () => {
        if (!window.electronAPI) return
        setLoading(true)
        const data = await window.electronAPI.people.getGraph()

        // 转换数据格式以适配 react-force-graph
        const formattedData = {
            nodes: data.nodes.map((n: any) => ({
                id: n.id,
                name: n.name,
                val: n.face_count || 1,
                color: '#22d3ee' // neon-cyan
            })),
            links: data.links.map((l: any) => ({
                source: l.source,
                target: l.target,
                value: l.value
            }))
        }

        setGraphData(formattedData)
        setLoading(false)

        // 初始缩放
        setTimeout(() => {
            if (graphRef.current) {
                graphRef.current.zoomToFit(400, 100)
            }
        }, 500)
    }

    if (loading) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center text-nexus-text-muted">
                <Loader2 className="w-10 h-10 animate-spin mb-4" />
                <p>正在计算社交关联...</p>
            </div>
        )
    }

    return (
        <div id="graph-container" className="w-full h-full bg-nexus-bg-secondary relative overflow-hidden">
            <ForceGraph2D
                ref={graphRef}
                graphData={graphData}
                width={dimensions.width}
                height={dimensions.height}
                nodeRelSize={6}
                nodeLabel="name"
                nodeAutoColorBy="id"
                linkWidth={(link: any) => Math.sqrt(link.value) * 2}
                linkColor={() => 'rgba(147, 51, 234, 0.2)'} // neon-purple with low opacity
                linkDirectionalParticles={2}
                linkDirectionalParticleSpeed={(d: any) => d.value * 0.001}
                onLinkClick={(link: any) => {
                    onLinkClick?.(link.source.id, link.target.id)
                }}
                nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
                    const label = node.name
                    const fontSize = 12 / globalScale
                    ctx.font = `${fontSize}px Sans-Serif`
                    const textWidth = ctx.measureText(label).width
                    const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2) as [number, number]

                    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
                    ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, ...bckgDimensions)

                    ctx.textAlign = 'center'
                    ctx.textBaseline = 'middle'
                    ctx.fillStyle = node.color
                    ctx.fillText(label, node.x, node.y)

                    // 绘制圆形节点
                    ctx.beginPath()
                    ctx.arc(node.x, node.y, node.val ? Math.sqrt(node.val) * 2 : 4, 0, 2 * Math.PI, false)
                    ctx.fillStyle = 'rgba(34, 211, 238, 0.6)'
                    ctx.fill()
                    ctx.strokeStyle = '#22d3ee'
                    ctx.stroke()
                }}
            />

            <div className="absolute bottom-4 left-4 bg-white/80 backdrop-blur-md p-3 rounded-lg border border-gray-100 shadow-sm text-xs space-y-2 pointer-events-none">
                <p className="font-bold flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-neon-cyan" /> 节点: 人物 (大小代表照片数)</p>
                <p className="font-bold flex items-center gap-2"><span className="w-4 h-0.5 bg-purple-200" /> 连线: 共同出现 (粗细代表频率)</p>
                <p className="text-nexus-text-muted mt-2">提示: 点击连线查看合影</p>
            </div>
        </div>
    )
}
