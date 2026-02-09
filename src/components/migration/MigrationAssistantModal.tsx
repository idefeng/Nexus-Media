import React, { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Upload, FileImage, Wand2, FileBox } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface MigrationAssistantModalProps {
    isOpen: boolean
    onClose: () => void
}

type Step = 'seed' | 'scope' | 'scanning' | 'buffer' | 'moving' | 'done'

interface CompareResult {
    path: string
    confidence_level: 'High' | 'Medium' | 'Low'
    reasons: string[]
    score: number
    selected?: boolean
    status?: 'pending' | 'moving' | 'done' | 'error'
    error?: string
}

export function MigrationAssistantModal({ isOpen, onClose }: MigrationAssistantModalProps) {
    const { t } = useTranslation()
    const [step, setStep] = useState<Step>('seed')

    // Step 1: Seed
    const [seedPath, setSeedPath] = useState<string | null>(null)
    const [seedAnalysis, setSeedAnalysis] = useState<any>(null)
    const [analyzingSeed, setAnalyzingSeed] = useState(false)

    // Step 2: Scope
    const [sourceDir, setSourceDir] = useState<string>('')
    const [targetDir, setTargetDir] = useState<string>('')
    const [criteria, setCriteria] = useState({
        time: true,
        location: true,
        face: true
    })

    // Step 3: Scanning
    const [scanProgress, setScanProgress] = useState(0)
    const [scanTotal, setScanTotal] = useState(0)
    const [results, setResults] = useState<CompareResult[]>([])

    const fileInputRef = useRef<HTMLInputElement>(null)

    // Step 5: Moving
    const [moveProgress, setMoveProgress] = useState(0)
    const [moveTotal, setMoveTotal] = useState(0)
    const [isMoving, setIsMoving] = useState(false)

    useEffect(() => {
        // Listen for scan progress if scanning
        if (step === 'scanning') {
            // @ts-ignore
            const cleanup = window.electronAPI.migration.onProgress((progress: any) => {
                setScanProgress(progress.scanned)
                setScanTotal(progress.total)
            })
            return cleanup
        }
    }, [step])

    const handleSelectSeed = () => {
        fileInputRef.current?.click()
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) handleFileProcess(file)
    }

    const handleFileDrop = async (e: React.DragEvent) => {
        e.preventDefault()
        const file = e.dataTransfer.files[0]
        if (file) handleFileProcess(file)
    }

    const handleFileProcess = (file: File) => {
        if (file.type.startsWith('image/')) {
            // @ts-ignore
            if (file.path) {
                // @ts-ignore
                setSeedPath(file.path)
                // @ts-ignore
                analyzeSeed(file.path)
            }
        }
    }

    const analyzeSeed = async (path: string) => {
        setAnalyzingSeed(true)
        try {
            console.log('Sending analyze request for:', path)
            const res = await window.electronAPI.migration.analyzeSeed(path)
            console.log('Analyze Response:', res)

            if (res.success && res.raw_data) {
                console.log('Setting seed analysis:', res.raw_data)
                setSeedAnalysis(res.raw_data)
            } else {
                console.error('Analysis failed or missing raw_data:', res)
            }
        } catch (e) {
            console.error('Analyze Error:', e)
        } finally {
            setAnalyzingSeed(false)
        }
    }

    const startScan = async () => {
        setStep('scanning')
        setResults([])
        setScanProgress(0)

        try {
            // 1. Scan directory
            const scanRes = await window.electronAPI.migration.scanDir([sourceDir])
            if (!scanRes.success) {
                console.error(scanRes) // Handle error
                setStep('scope')
                return
            }

            setScanTotal(scanRes.files.length)

            // 2. Compare batch
            // Extract just paths for comparison
            const targetPaths = scanRes.files.map((f: any) => f.path)

            const compareRes = await window.electronAPI.migration.compareBatch(
                seedAnalysis,
                targetPaths,
                criteria
            )

            if (compareRes.success && compareRes.results) {
                const mappedResults: CompareResult[] = compareRes.results.map((r: any) => ({
                    path: r.path,
                    confidence_level: r.score > 0.8 ? 'High' : r.score > 0.5 ? 'Medium' : 'Low',
                    reasons: r.reasons || [],
                    score: r.score,
                    selected: r.score > 0.6 // Auto-select high confidence matches
                }))
                setResults(mappedResults)
                setStep('buffer')
            } else {
                console.error('Batch comparison failed:', compareRes.error)
                setStep('scope')
            }

        } catch (e) {
            console.error(e)
            setStep('scope')
        }
    }

    const startMove = async () => {
        const selectedItems = results.filter(r => r.selected)
        if (selectedItems.length === 0) return

        setStep('moving')
        setIsMoving(true)
        setMoveTotal(selectedItems.length)
        setMoveProgress(0)

        // Process sequentially to update progress
        for (let i = 0; i < selectedItems.length; i++) {
            const item = selectedItems[i]
            try {
                // Update item status to moving (could be used for detailed UI)

                const res = await window.electronAPI.migration.moveFile(item.path, targetDir)

                setResults(prev => prev.map(p =>
                    p.path === item.path
                        ? { ...p, status: res.success ? 'done' : 'error', error: res.error }
                        : p
                ))

            } catch (e) {
                console.error(e)
            }
            setMoveProgress(i + 1)
        }

        setIsMoving(false)
        setTimeout(() => {
            setStep('done')
        }, 500)
    }

    // ... Rest of the component (To be implemented in chunks or full file if it fits)

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-[#121217] w-[800px] h-[600px] rounded-2xl border border-white/10 flex flex-col overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="h-16 border-b border-white/10 flex items-center justify-between px-6">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-neon-blue/20 flex items-center justify-center">
                            <Wand2 className="w-5 h-5 text-neon-blue" />
                        </div>
                        <h2 className="text-lg font-medium text-white">Migration Assistant</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-5 h-5 text-white/60" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 p-6 overflow-y-auto">
                    {step === 'seed' && (
                        <div className="h-full flex flex-col items-center justify-center p-8 border-2 border-dashed border-white/10 rounded-xl bg-white/5"
                            onDragOver={e => e.preventDefault()}
                            onDrop={handleFileDrop}
                        >
                            {analyzingSeed ? (
                                <div className="text-center">
                                    <div className="animate-spin w-8 h-8 border-2 border-neon-blue border-t-transparent rounded-full mx-auto mb-4" />
                                    <p className="text-white/60">{t('migration.analyzing', 'Analyzing Seed Photo...')}</p>
                                </div>
                            ) : seedAnalysis ? (
                                <div className="w-full max-w-md">
                                    <div className="flex items-start gap-4 mb-6 bg-white/5 p-4 rounded-lg">
                                        <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 border border-white/10 bg-black/50">
                                            <img
                                                src={`nexus-media://local/${seedPath}`}
                                                alt="Seed"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white font-medium truncate mb-2" title={seedPath || ''}>{seedPath?.split(/[\\/]/).pop()}</p>
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-white/60">
                                                {seedAnalysis.datetime && (
                                                    <div className="flex items-center gap-1 col-span-2">
                                                        <span>📅</span>
                                                        <span>{seedAnalysis.datetime.replace('T', ' ')}</span>
                                                    </div>
                                                )}
                                                {seedAnalysis.face_count !== undefined && (
                                                    <div className="flex items-center gap-1">
                                                        <span>👤</span>
                                                        <span>{t('migration.faces_count', { count: seedAnalysis.face_count, defaultValue: '{{count}} Faces' })}</span>
                                                    </div>
                                                )}
                                                {seedAnalysis.gps && (
                                                    <div className="flex items-center gap-1 col-span-2">
                                                        <span>📍</span>
                                                        <span>{seedAnalysis.gps[0].toFixed(4)}, {seedAnalysis.gps[1].toFixed(4)}</span>
                                                    </div>
                                                )}
                                                {/* Fallback for raw data items if available */}
                                                {seedAnalysis.make && <div className="col-span-2">📷 {seedAnalysis.make} {seedAnalysis.model}</div>}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setStep('scope')}
                                        className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/20"
                                    >
                                        {t('common.continue', 'Continue')}
                                    </button>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <Upload className="w-12 h-12 text-white/20 mx-auto mb-4" />
                                    <p className="text-white/60 mb-2">{t('migration.drop_hint', 'Drag & Drop Seed Photo Here')}</p>
                                    <p className="text-white/40 text-sm">{t('migration.click_hint', 'or click to browse')}</p>
                                    <input
                                        type="file"
                                        hidden
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        accept="image/*"
                                    />
                                </div>
                            )}
                            {/* Make the whole area clickable if empty, or just the text */}
                            {!analyzingSeed && !seedAnalysis && (
                                <div className="absolute inset-0 cursor-pointer" onClick={handleSelectSeed} />
                            )}
                        </div>
                    )}

                    {step === 'scope' && (
                        <div className="space-y-6">
                            {/* Source & Target */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm text-white/60 mb-2">Source Directory</label>
                                    <div className="flex gap-2">
                                        <input type="text" value={sourceDir} readOnly className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white/80" />
                                        <button
                                            onClick={async () => {
                                                const paths = await window.electronAPI.dialog.selectFolder()
                                                if (paths && paths.length > 0) setSourceDir(paths[0])
                                            }}
                                            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white"
                                        >
                                            Browse
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm text-white/60 mb-2">Target Directory</label>
                                    <div className="flex gap-2">
                                        <input type="text" value={targetDir} readOnly className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white/80" />
                                        <button
                                            onClick={async () => {
                                                const paths = await window.electronAPI.dialog.selectFolder()
                                                if (paths && paths.length > 0) setTargetDir(paths[0])
                                            }}
                                            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white"
                                        >
                                            Browse
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Criteria */}
                            <div className="bg-white/5 rounded-xl p-4">
                                <h3 className="text-white font-medium mb-3">Matching Criteria</h3>
                                <div className="space-y-3">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input type="checkbox" checked={criteria.time} onChange={e => setCriteria({ ...criteria, time: e.target.checked })} className="w-4 h-4 rounded bg-white/10 border-white/20 text-neon-blue" />
                                        <div>
                                            <span className="text-white text-sm">Match Date & Time</span>
                                            <p className="text-xs text-white/40">Within ±24 hours of seed photo</p>
                                        </div>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input type="checkbox" checked={criteria.location} onChange={e => setCriteria({ ...criteria, location: e.target.checked })} className="w-4 h-4 rounded bg-white/10 border-white/20 text-neon-blue" />
                                        <div>
                                            <span className="text-white text-sm">Match Location</span>
                                            <p className="text-xs text-white/40">Within 500m radius</p>
                                        </div>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input type="checkbox" checked={criteria.face} onChange={e => setCriteria({ ...criteria, face: e.target.checked })} className="w-4 h-4 rounded bg-white/10 border-white/20 text-neon-blue" />
                                        <div>
                                            <span className="text-white text-sm">Match Faces</span>
                                            <p className="text-xs text-white/40">Contains same people (AI Recognition)</p>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4">
                                <button
                                    onClick={startScan}
                                    disabled={!sourceDir || !targetDir}
                                    className="px-6 py-2 bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg hover:bg-blue-500 transition-colors"
                                >
                                    Start Scan
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'scanning' && (
                        <div className="h-full flex flex-col items-center justify-center">
                            <div className="w-full max-w-md space-y-4 text-center">
                                <div className="w-16 h-16 rounded-full border-4 border-white/10 border-t-neon-blue animate-spin mx-auto" />
                                <h3 className="text-xl text-white font-medium">
                                    {scanTotal > 0 && scanProgress >= scanTotal ? t('migration.analyzing', 'Analyzing...') : t('migration.scanning', 'Scanning...')}
                                </h3>
                                <p className="text-white/60">
                                    {scanTotal > 0 && scanProgress >= scanTotal
                                        ? t('migration.comparing', 'Comparing files against seed photo')
                                        : t('migration.files_found', { count: scanProgress, defaultValue: `Found {{count}} files...` })}
                                </p>
                                {scanTotal > 0 && scanProgress < scanTotal && (
                                    <div className="h-2 bg-white/10 rounded-full overflow-hidden mt-4">
                                        <motion.div
                                            className="h-full bg-neon-blue"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(scanProgress / scanTotal) * 100}%` }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {step === 'buffer' && (
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-white font-medium">Review Matches</h3>
                                <div className="text-sm text-white/60">
                                    Found {results.length} matches
                                </div>
                            </div>
                            <div className="grid grid-cols-4 gap-4">
                                {results.map((item, idx) => (
                                    <div key={idx} className={`relative group aspect-square bg-white/5 rounded-lg overflow-hidden border ${item.selected ? 'border-neon-blue' : 'border-transparent'}`}>
                                        <div className="absolute top-2 left-2 z-10">
                                            <input type="checkbox" checked={item.selected} className="w-4 h-4" readOnly />
                                        </div>
                                        <div className="absolute inset-0 flex items-center justify-center text-white/20">
                                            <FileImage className="w-10 h-10" />
                                        </div>
                                        <div className="absolute bottom-0 inset-x-0 bg-black/60 p-2 text-xs">
                                            <div className="text-white truncate">{item.path.split(/[\\/]/).pop()}</div>
                                            <div className="text-neon-blue">{item.confidence_level}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button className="px-4 py-2 text-white/60 hover:text-white" onClick={onClose}>Cancel</button>
                                <button
                                    onClick={startMove}
                                    className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-500 transition-colors"
                                >
                                    Move Selected
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'moving' && (
                        <div className="h-full flex flex-col items-center justify-center space-y-6">
                            <div className="w-full max-w-md space-y-2">
                                <div className="flex justify-between text-sm text-white/60">
                                    <span>Moving files...</span>
                                    <span>{moveProgress} / {moveTotal}</span>
                                </div>
                                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-neon-blue"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(moveProgress / moveTotal) * 100}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 'done' && (
                        <div className="h-full flex flex-col items-center justify-center space-y-6">
                            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
                                <FileBox className="w-10 h-10 text-green-500" />
                            </div>
                            <h3 className="text-2xl text-white font-medium">Migration Complete!</h3>
                            <p className="text-white/60">Successfully moved {results.filter(r => r.status === 'done').length} files.</p>
                            <button
                                onClick={onClose}
                                className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
