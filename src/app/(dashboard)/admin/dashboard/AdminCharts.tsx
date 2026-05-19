import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function AdminCharts({ branchData, statusData, currentBatch }: { branchData: any[], statusData: any[], currentBatch: string }) {
    const PIE_COLORS = ['#22c55e', '#ef4444', '#9ca3af']; // Green-500, Red-500, Gray-400

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4 border-none shadow-lg hover:shadow-xl transition-shadow bg-white/80 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-xl font-bold text-gray-800">Placement by Branch</CardTitle>
                    <CardDescription className="text-gray-500">
                        Comparison of total students vs placed students for {currentBatch}.
                    </CardDescription>
                </CardHeader>
                <CardContent className="px-2">
                    <div className="h-[350px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={branchData}
                                margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
                                barGap={12}
                            >
                                <defs>
                                    <linearGradient id="colorPlaced" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4ade80" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0.8} />
                                    </linearGradient>
                                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#0891b2" stopOpacity={0.8} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis
                                    dataKey="branch"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#475569', fontSize: 13, fontWeight: 500 }}
                                    dy={15}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                                    tickFormatter={(value) => `${value}`}
                                />
                                <Tooltip
                                    cursor={{ fill: '#f1f5f9' }}
                                    contentStyle={{
                                        borderRadius: '16px',
                                        border: '1px solid #e2e8f0',
                                        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                                        padding: '16px',
                                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                        backdropFilter: 'blur(8px)'
                                    }}
                                    itemStyle={{ fontWeight: 600, fontSize: '13px' }}
                                />
                                <Legend
                                    verticalAlign="top"
                                    align="right"
                                    wrapperStyle={{ paddingBottom: '30px', fontSize: '13px', fontWeight: 500 }}
                                    iconType="circle"
                                />
                                <Bar
                                    dataKey="placed"
                                    name="Placed"
                                    fill="url(#colorPlaced)"
                                    radius={[6, 6, 0, 0]}
                                    barSize={24}
                                />
                                <Bar
                                    dataKey="total"
                                    name="Total Students"
                                    fill="url(#colorTotal)"
                                    radius={[6, 6, 0, 0]}
                                    barSize={24}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            <Card className="col-span-3 border border-gray-100 shadow-xl hover:shadow-2xl transition-all duration-300 bg-white/90 backdrop-blur-md rounded-3xl overflow-hidden">
                <CardHeader>
                    <CardTitle className="text-xl font-extrabold text-slate-800">Overall Status</CardTitle>
                    <CardDescription className="text-slate-500 font-medium">
                        Percentage of students placed vs unplaced for {currentBatch}.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[350px] w-full flex items-center justify-center relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={statusData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={85}
                                    outerRadius={115}
                                    paddingAngle={8}
                                    dataKey="value"
                                    cornerRadius={12}
                                    stroke="none"
                                >
                                    {statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: '16px',
                                        border: '1px solid #e2e8f0',
                                        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                        backdropFilter: 'blur(8px)',
                                        padding: '12px'
                                    }}
                                    itemStyle={{ fontWeight: 700 }}
                                />
                                <Legend
                                    verticalAlign="bottom"
                                    height={36}
                                    iconType="circle"
                                    wrapperStyle={{ fontWeight: 600, fontSize: '14px', color: '#475569' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-4xl font-black text-slate-800">
                                {statusData[0]?.value + statusData[1]?.value || 0}
                            </span>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Students</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
