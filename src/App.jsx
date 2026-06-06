import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BatteryCharging,
  Bot,
  Brain,
  Car,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  CloudSun,
  Cpu,
  DatabaseZap,
  Eye,
  FileCheck,
  Gauge,
  GitBranch,
  LayoutDashboard,
  LockKeyhole,
  MapPinned,
  Navigation,
  Network,
  Play,
  PlugZap,
  RadioTower,
  RefreshCw,
  Route,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TerminalSquare,
  ThermometerSun,
  Timer,
  TrendingDown,
  TrendingUp,
  Users,
  WalletCards,
  Wrench,
  Zap
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8795';

const sampleStations = [
  {
    id: 'KS-SOUTH',
    name: '昆山南综合超充站',
    distanceKm: 42,
    detourKm: 1.8,
    price: 1.18,
    powerKw: 480,
    available: 7,
    queueMinutes: 6,
    faultRisk: 0.04,
    score: 78.4,
    arrivalSoc: 29,
    energyAddedKwh: 17.3,
    chargeMinutes: 18,
    targetSoc: 52,
    finalSoc: 24,
    amenities: ['休息区', '卫生间', '咖啡']
  },
  {
    id: 'HONGQIAO-EAST',
    name: '虹桥东交通枢纽站',
    distanceKm: 92,
    detourKm: 0.9,
    price: 1.42,
    powerKw: 600,
    available: 5,
    queueMinutes: 11,
    faultRisk: 0.03,
    score: 73.8,
    arrivalSoc: 15,
    energyAddedKwh: 18.8,
    chargeMinutes: 15,
    targetSoc: 45,
    finalSoc: 22,
    amenities: ['商场', '休息区', '餐饮']
  },
  {
    id: 'TAICANG-HUB',
    name: '太仓城际能源港',
    distanceKm: 61,
    detourKm: 3.6,
    price: 0.96,
    powerKw: 360,
    available: 3,
    queueMinutes: 18,
    faultRisk: 0.08,
    score: 68.2,
    arrivalSoc: 23,
    energyAddedKwh: 22.5,
    chargeMinutes: 24,
    targetSoc: 54,
    finalSoc: 26,
    amenities: ['便利店', '雨棚']
  },
  {
    id: 'G2-SERVICE',
    name: 'G2 阳澄湖服务区快充',
    distanceKm: 33,
    detourKm: 0.2,
    price: 1.55,
    powerKw: 240,
    available: 1,
    queueMinutes: 24,
    faultRisk: 0.12,
    score: 59.5,
    arrivalSoc: 31,
    energyAddedKwh: 20.3,
    chargeMinutes: 32,
    targetSoc: 58,
    finalSoc: 25,
    amenities: ['高速服务区']
  }
];

const sampleSteps = [
  {
    id: 'intent',
    title: '理解用户目标',
    agent: 'Intent Agent',
    status: 'done',
    durationMs: 340,
    tool: 'nlp.extract_trip_constraints',
    output: {
      origin: '苏州工业园区',
      destination: '上海虹桥',
      preference: ['少排队', '成本低', '到达电量安全'],
      departureHour: 19
    }
  },
  {
    id: 'vehicle',
    title: '读取车辆数字孪生',
    agent: 'Vehicle Twin Agent',
    status: 'done',
    durationMs: 410,
    tool: 'vehicle.get_state',
    output: {
      soc: '42%',
      soh: '91.8%',
      batteryTemp: '18°C',
      avgConsumption: '15.8 kWh/100km'
    }
  },
  {
    id: 'energy',
    title: '预测路线真实能耗',
    agent: 'Energy Forecast Agent',
    status: 'done',
    durationMs: 760,
    tool: 'model.predict_energy',
    output: {
      routeKm: 106,
      estimatedKwh: 18.4,
      socDrop: '25%',
      arrivalWithoutCharge: '17%'
    }
  },
  {
    id: 'station',
    title: '检索可用补能网络',
    agent: 'Charging Network Agent',
    status: 'done',
    durationMs: 620,
    tool: 'charging.search_and_filter',
    output: {
      candidates: 4,
      filteredRules: ['绕路 <= 8km', '故障风险 < 15%', '到站 SOC > 8%']
    }
  },
  {
    id: 'optimize',
    title: '多目标决策排序',
    agent: 'Decision Agent',
    status: 'done',
    durationMs: 930,
    tool: 'optimizer.rank_plans',
    output: {
      weights: { time: 42, cost: 32, batterySafety: 26 },
      selected: '昆山南综合超充站',
      score: 78.4,
      alternative: '虹桥东交通枢纽站'
    }
  },
  {
    id: 'confirm',
    title: '生成可解释方案并等待确认',
    agent: 'Experience Agent',
    status: 'awaiting',
    durationMs: 220,
    tool: 'ux.render_confirmable_plan',
    output: {
      action: '同步到车机导航前需要用户确认',
      fallback: '若站点排队超过 15 分钟，自动切换备选站'
    }
  }
];

const initialRun = {
  runId: 'VP-DEMO-0528',
  prompt: '今晚 19:30 从苏州到上海虹桥，要求少排队、成本低',
  mode: 'mock',
  summary: '建议在昆山南综合超充站补能 18 分钟，预计等待 6 分钟，到达目的地剩余 24% 电量。',
  decision: {
    selectedStationId: 'KS-SOUTH',
    selectedStation: '昆山南综合超充站',
    chargeMinutes: 18,
    expectedQueueMinutes: 6,
    targetSoc: 52,
    finalSoc: 24,
    estimatedCost: 20.4,
    riskLevel: '低',
    explanation: [
      '昆山南综合超充站在当前权重下综合得分最高，排队时间和故障风险都低于沿途均值。',
      '最近的 G2 服务区虽然绕路少，但预计等待 24 分钟且故障风险更高，不符合“少排队”的目标。',
      '补能到 52% 后，到达目的地预计保留 24% 电量，满足安全冗余。'
    ]
  },
  telemetry: {
    vehicle: {
      model: 'SUV 75kWh 后驱长续航',
      soc: 42,
      soh: 91.8,
      batteryTemp: 18,
      odometerKm: 46320,
      avgConsumption: 15.8,
      fastChargeRatio: 38
    },
    routeKm: 106,
    estimatedKwh: 18.4,
    socDrop: 25,
    arrivalWithoutCharge: 17
  },
  stations: sampleStations,
  steps: sampleSteps
};

const navItems = [
  { id: 'console', label: 'AI 补能台', icon: LayoutDashboard },
  { id: 'battery', label: '电池健康', icon: BatteryCharging },
  { id: 'ops', label: '站点运营', icon: Network },
  { id: 'fleet', label: '车队调度', icon: Users },
  { id: 'model', label: '模型评估', icon: Brain },
  { id: 'data', label: '数据权限', icon: LockKeyhole }
];

const kpis = [
  { label: '续航预测误差', value: '4.8%', trend: '-1.2pp', icon: Gauge, tone: 'good' },
  { label: '推荐采纳率', value: '71%', trend: '+8.4%', icon: ClipboardCheck, tone: 'good' },
  { label: '等待时间下降', value: '18min', trend: '单次长途', icon: Timer, tone: 'warn' },
  { label: '异常提前发现', value: '9天', trend: '电池风险', icon: ShieldCheck, tone: 'good' }
];

const batteryDrivers = [
  { name: '高倍率快充占比', value: 38, impact: '中', detail: '过去 30 天高峰时段快充偏多' },
  { name: '低温满电停放', value: 14, impact: '低', detail: '低于 5°C 环境下满电停放 4 次' },
  { name: '深度放电次数', value: 6, impact: '中', detail: 'SOC < 12% 的行程仍有发生' },
  { name: '热管理异常', value: 3, impact: '低', detail: '第 7 模组温差偶发超过 2.6°C' }
];

const opsStations = [
  { name: '昆山南综合超充站', load: 74, demand: '+23%', fault: '低', price: '1.18', action: '保价引流' },
  { name: '虹桥东交通枢纽站', load: 88, demand: '+31%', fault: '低', price: '1.42', action: '排队分流' },
  { name: 'G2 阳澄湖服务区', load: 93, demand: '+17%', fault: '高', price: '1.55', action: '优先巡检' },
  { name: '太仓城际能源港', load: 59, demand: '+8%', fault: '中', price: '0.96', action: '低价承接' }
];

const fleetVehicles = [
  { plate: '苏A D8217', driver: '城配 01', soc: 36, task: '苏州北 -> 虹桥', eta: '20:48', status: '需补能' },
  { plate: '沪B F6032', driver: '网约 12', soc: 68, task: '虹桥 -> 张江', eta: '21:12', status: '执行中' },
  { plate: '苏E M1189', driver: '冷链 04', soc: 22, task: '昆山 -> 青浦', eta: '20:20', status: '高优先级' },
  { plate: '浙A K9021', driver: '租赁 08', soc: 81, task: '待命', eta: '22:00', status: '可调度' }
];

const evalCases = [
  { name: '冬季高速续航预测', baseline: '9.6%', current: '5.1%', status: '通过' },
  { name: '充电站拥堵预测', baseline: '14.2min', current: '7.8min', status: '观察' },
  { name: '异常电池解释一致性', baseline: '82%', current: '94%', status: '通过' },
  { name: 'Agent 工具调用成功率', baseline: '91%', current: '98%', status: '通过' }
];

function App() {
  const [activeView, setActiveView] = useState('console');
  const [prompt, setPrompt] = useState('今晚 19:30 从苏州到上海虹桥，要求少排队、成本低');
  const [weights, setWeights] = useState({ time: 42, cost: 32, batterySafety: 26 });
  const [agentRun, setAgentRun] = useState(initialRun);
  const [isRunning, setIsRunning] = useState(false);
  const [apiHealth, setApiHealth] = useState(null);
  const [lastError, setLastError] = useState('');
  const [consents, setConsents] = useState({
    vehicle: true,
    location: true,
    battery: true,
    charging: true,
    thirdParty: false
  });

  useEffect(() => {
    fetch(`${API_BASE}/api/health`)
      .then((res) => res.json())
      .then(setApiHealth)
      .catch(() => setApiHealth({ ok: false, deepseekConfigured: false, model: 'mock' }));
  }, []);

  const selectedStation = useMemo(() => {
    return agentRun.stations.find((station) => station.id === agentRun.decision.selectedStationId) || agentRun.stations[0];
  }, [agentRun]);

  const handleWeight = (key, value) => {
    setWeights((current) => ({ ...current, [key]: Number(value) }));
  };

  const runAgent = async () => {
    setIsRunning(true);
    setLastError('');
    try {
      const response = await fetch(`${API_BASE}/api/agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, weights })
      });
      const data = await response.json();
      setAgentRun(data);
      if (data.apiError) setLastError(data.apiError);
    } catch (error) {
      setLastError(`本地 API 未连接：${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="app-shell">
      <Sidebar activeView={activeView} onChange={setActiveView} />
      <main className="workspace">
        <TopBar apiHealth={apiHealth} agentRun={agentRun} />
        {activeView === 'console' && (
          <ConsoleView
            prompt={prompt}
            setPrompt={setPrompt}
            weights={weights}
            handleWeight={handleWeight}
            runAgent={runAgent}
            isRunning={isRunning}
            agentRun={agentRun}
            selectedStation={selectedStation}
            lastError={lastError}
          />
        )}
        {activeView === 'battery' && <BatteryView agentRun={agentRun} />}
        {activeView === 'ops' && <OpsView />}
        {activeView === 'fleet' && <FleetView />}
        {activeView === 'model' && <ModelView agentRun={agentRun} />}
        {activeView === 'data' && <DataView consents={consents} setConsents={setConsents} />}
      </main>
    </div>
  );
}

function Sidebar({ activeView, onChange }) {
  return (
    <aside className="sidebar">
      <div className="brand-lockup">
        <div className="brand-mark">
          <Zap size={22} />
        </div>
        <div>
          <strong>VoltPilot</strong>
          <span>AI EV Agent</span>
        </div>
      </div>
      <nav className="nav-list" aria-label="主导航">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={`nav-item ${activeView === item.id ? 'active' : ''}`}
              onClick={() => onChange(item.id)}
              title={item.label}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="sidebar-foot">
        <div className="tiny-label">商业作品集模块</div>
        <div className="capability-stack">
          <span>Agent Workflow</span>
          <span>Battery Twin</span>
          <span>Ops Console</span>
        </div>
      </div>
    </aside>
  );
}

function TopBar({ apiHealth, agentRun }) {
  return (
    <header className="topbar">
      <div>
        <div className="eyebrow">
          <RadioTower size={14} />
          车端数据 · 充电网络 · 天气路况 · 模型评估
        </div>
        <h1>新能源汽车 AI 补能与电池健康 Agent 平台</h1>
      </div>
      <div className="topbar-actions">
        <StatusPill
          icon={apiHealth?.deepseekConfigured ? Sparkles : Bot}
          label={apiHealth?.deepseekConfigured ? 'DeepSeek 已接入' : 'Mock 演示模式'}
          detail={apiHealth?.model || 'deepseek-v4-flash'}
          tone={apiHealth?.deepseekConfigured ? 'good' : 'neutral'}
        />
        <StatusPill icon={GitBranch} label="Run ID" detail={agentRun.runId} tone="neutral" />
      </div>
    </header>
  );
}

function StatusPill({ icon: Icon, label, detail, tone }) {
  return (
    <div className={`status-pill ${tone}`}>
      <Icon size={16} />
      <div>
        <span>{label}</span>
        <strong>{detail}</strong>
      </div>
    </div>
  );
}

function ConsoleView({
  prompt,
  setPrompt,
  weights,
  handleWeight,
  runAgent,
  isRunning,
  agentRun,
  selectedStation,
  lastError
}) {
  return (
    <div className="view-stack">
      <section className="metric-strip">
        {kpis.map((item) => (
          <MetricTile key={item.label} {...item} />
        ))}
      </section>

      <section className="console-grid">
        <div className="primary-console">
          <PanelHeader
            icon={Route}
            title="AI 出行补能规划台"
            subtitle="多目标路线、排队、价格与电池安全联合决策"
            action={
              <button className="icon-button" title="刷新站点数据">
                <RefreshCw size={18} />
              </button>
            }
          />
          <div className="mission-composer">
            <div className="input-wrap">
              <Search size={18} />
              <input
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="输入出行目标，例如：明天从上海到杭州，少排队并控制成本"
              />
            </div>
            <button className="primary-button" onClick={runAgent} disabled={isRunning}>
              {isRunning ? <RefreshCw size={18} className="spin" /> : <Play size={18} />}
              {isRunning ? 'Agent 运行中' : '运行 Agent'}
            </button>
          </div>
          {lastError && (
            <div className="api-warning">
              <AlertTriangle size={16} />
              <span>{lastError}</span>
            </div>
          )}
          <RouteMap agentRun={agentRun} selectedStation={selectedStation} />
          <div className="decision-band">
            <div>
              <div className="tiny-label">推荐方案</div>
              <h2>{agentRun.decision.selectedStation}</h2>
              <p>{agentRun.summary}</p>
            </div>
            <div className="decision-metrics">
              <DecisionMetric label="补能时长" value={`${agentRun.decision.chargeMinutes}min`} />
              <DecisionMetric label="预计排队" value={`${agentRun.decision.expectedQueueMinutes}min`} />
              <DecisionMetric label="到达剩余" value={`${agentRun.decision.finalSoc}%`} />
              <DecisionMetric label="预估费用" value={`¥${agentRun.decision.estimatedCost}`} />
            </div>
          </div>
        </div>

        <aside className="agent-panel">
          <PanelHeader icon={Brain} title="Agent 决策解释" subtitle="工具调用、约束检查与等待确认" />
          <AgentTimeline steps={agentRun.steps} />
        </aside>
      </section>

      <section className="lower-grid">
        <div className="analysis-panel">
          <PanelHeader icon={Activity} title="SOC 与能耗预测" subtitle="真实路况下的电量曲线" />
          <SocChart agentRun={agentRun} />
        </div>
        <div className="analysis-panel">
          <PanelHeader icon={SlidersHorizontal} title="决策权重" subtitle="产品经理可配置的策略旋钮" />
          <WeightControl label="时间效率" keyName="time" value={weights.time} onChange={handleWeight} />
          <WeightControl label="补能成本" keyName="cost" value={weights.cost} onChange={handleWeight} />
          <WeightControl label="电池安全冗余" keyName="batterySafety" value={weights.batterySafety} onChange={handleWeight} />
        </div>
        <div className="analysis-panel wide">
          <PanelHeader icon={PlugZap} title="候选充电站排序" subtitle="排队、绕路、功率、故障风险综合评分" />
          <StationTable stations={agentRun.stations} selectedId={agentRun.decision.selectedStationId} />
        </div>
      </section>
    </div>
  );
}

function MetricTile({ label, value, trend, icon: Icon, tone }) {
  return (
    <div className="metric-tile">
      <div className={`metric-icon ${tone}`}>
        <Icon size={18} />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <em>{trend}</em>
    </div>
  );
}

function PanelHeader({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="panel-header">
      <div className="panel-title">
        <Icon size={19} />
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

function RouteMap({ agentRun, selectedStation }) {
  const stations = agentRun.stations;
  return (
    <div className="route-map" aria-label="路线补能地图">
      <div className="map-grid" />
      <div className="route-line">
        <span className="route-node start">
          <MapPinned size={15} />
          苏州
        </span>
        <span className="route-node end">
          <Navigation size={15} />
          {agentRun.steps?.[0]?.output?.destination || '上海虹桥'}
        </span>
      </div>
      {stations.map((station, index) => (
        <div
          key={station.id}
          className={`station-marker ${station.id === selectedStation.id ? 'selected' : ''}`}
          style={{ left: `${22 + index * 19}%`, top: `${index % 2 ? 38 : 58}%` }}
        >
          <div className="marker-pin">
            <PlugZap size={15} />
          </div>
          <div className="marker-label">
            <strong>{station.name}</strong>
            <span>{station.queueMinutes}min · {station.powerKw}kW</span>
          </div>
        </div>
      ))}
      <div className="vehicle-card">
        <Car size={18} />
        <div>
          <strong>{agentRun.telemetry.vehicle.soc}% SOC</strong>
          <span>{agentRun.telemetry.vehicle.model}</span>
        </div>
      </div>
      <div className="weather-card">
        <CloudSun size={18} />
        <div>
          <strong>能耗 +{Math.round((agentRun.telemetry.weatherFactor || 1.04) * 100 - 100)}%</strong>
          <span>夜间温度与高速风阻修正</span>
        </div>
      </div>
    </div>
  );
}

function DecisionMetric({ label, value }) {
  return (
    <div className="decision-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function AgentTimeline({ steps }) {
  return (
    <div className="agent-timeline">
      {steps.map((step, index) => (
        <div key={step.id} className={`agent-step ${step.status}`}>
          <div className="step-rail">
            <span>{step.status === 'done' ? <CheckCircle2 size={17} /> : <Eye size={17} />}</span>
            {index < steps.length - 1 && <i />}
          </div>
          <div className="step-body">
            <div className="step-head">
              <div>
                <strong>{step.title}</strong>
                <span>{step.agent}</span>
              </div>
              <em>{step.durationMs}ms</em>
            </div>
            <div className="tool-chip">
              <TerminalSquare size={14} />
              {step.tool}
            </div>
            <pre>{JSON.stringify(step.output, null, 2)}</pre>
          </div>
        </div>
      ))}
    </div>
  );
}

function SocChart({ agentRun }) {
  const points = [
    { label: '出发', value: agentRun.telemetry.vehicle.soc },
    { label: '到站', value: agentRun.stations[0]?.arrivalSoc || 28 },
    { label: '补能', value: agentRun.decision.targetSoc },
    { label: '高速段', value: Math.max(agentRun.decision.finalSoc + 10, 25) },
    { label: '到达', value: agentRun.decision.finalSoc }
  ];

  return (
    <div className="soc-chart">
      {points.map((point) => (
        <div className="soc-column" key={point.label}>
          <div className="soc-bar">
            <span style={{ height: `${point.value}%` }} />
          </div>
          <strong>{point.value}%</strong>
          <em>{point.label}</em>
        </div>
      ))}
      <div className="chart-note">
        <ThermometerSun size={16} />
        <span>已纳入电池温度、夜间温差、路线速度与历史能耗画像。</span>
      </div>
    </div>
  );
}

function WeightControl({ label, keyName, value, onChange }) {
  return (
    <label className="weight-control">
      <div>
        <span>{label}</span>
        <strong>{value}%</strong>
      </div>
      <input
        type="range"
        min="10"
        max="70"
        value={value}
        onChange={(event) => onChange(keyName, event.target.value)}
      />
    </label>
  );
}

function StationTable({ stations, selectedId }) {
  return (
    <div className="station-table">
      <div className="table-row table-head">
        <span>站点</span>
        <span>评分</span>
        <span>排队</span>
        <span>功率</span>
        <span>电价</span>
        <span>风险</span>
      </div>
      {stations.map((station) => (
        <div className={`table-row ${station.id === selectedId ? 'selected' : ''}`} key={station.id}>
          <span>
            <strong>{station.name}</strong>
            <em>绕路 {station.detourKm}km · 可用 {station.available} 枪</em>
          </span>
          <span>{station.score}</span>
          <span>{station.queueMinutes}min</span>
          <span>{station.powerKw}kW</span>
          <span>¥{station.price}</span>
          <span>{Math.round(station.faultRisk * 100)}%</span>
        </div>
      ))}
    </div>
  );
}

function BatteryView({ agentRun }) {
  const cells = Array.from({ length: 48 }, (_, index) => {
    const wave = Math.sin(index * 0.7) * 8;
    const isWarm = index === 31 || index === 32;
    return Math.round(82 + wave + (isWarm ? 16 : 0));
  });

  return (
    <div className="view-stack">
      <section className="battery-hero">
        <div className="battery-summary">
          <PanelHeader icon={BatteryCharging} title="电池健康数字孪生" subtitle="SOH、温差、快充行为与残值风险统一建模" />
          <div className="battery-score">
            <Donut value={agentRun.telemetry.vehicle.soh} label="SOH" />
            <div>
              <h2>{agentRun.telemetry.vehicle.model}</h2>
              <p>车辆里程 {agentRun.telemetry.vehicle.odometerKm.toLocaleString()} km，快充占比 {agentRun.telemetry.vehicle.fastChargeRatio}%。系统判断当前电池健康处于可控区间，但建议降低低温满电停放。</p>
              <div className="recommendation-row">
                <span><ShieldCheck size={16} /> 质保风险：低</span>
                <span><TrendingDown size={16} /> 残值影响：-2.4%</span>
                <span><Wrench size={16} /> 建议 14 天内检查热管理</span>
              </div>
            </div>
          </div>
        </div>
        <div className="pack-panel">
          <PanelHeader icon={Cpu} title="电池包模组热力图" subtitle="48 个采样单元的健康状态" />
          <div className="cell-grid">
            {cells.map((value, index) => (
              <span
                key={`${value}-${index}`}
                className={value > 96 ? 'cell hot' : value < 76 ? 'cell cool' : 'cell'}
                title={`Cell ${index + 1}: ${value}`}
              />
            ))}
          </div>
          <div className="legend">
            <span><i className="cell" /> 正常</span>
            <span><i className="cell cool" /> 偏低</span>
            <span><i className="cell hot" /> 温差异常</span>
          </div>
        </div>
      </section>

      <section className="driver-grid">
        {batteryDrivers.map((driver) => (
          <div className="driver-card" key={driver.name}>
            <div>
              <span>{driver.name}</span>
              <strong>{driver.value}%</strong>
            </div>
            <Progress value={driver.value} />
            <p>{driver.detail}</p>
            <em className={driver.impact === '中' ? 'warn-text' : 'good-text'}>影响等级：{driver.impact}</em>
          </div>
        ))}
      </section>
    </div>
  );
}

function Donut({ value, label }) {
  const style = { background: `conic-gradient(#1f9d7a ${value * 3.6}deg, #d7e4df 0deg)` };
  return (
    <div className="donut" style={style}>
      <div>
        <strong>{value}%</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

function Progress({ value }) {
  return (
    <div className="progress">
      <span style={{ width: `${value}%` }} />
    </div>
  );
}

function OpsView() {
  return (
    <div className="view-stack">
      <section className="ops-grid">
        <div className="ops-map">
          <PanelHeader icon={Network} title="充电站运营指挥台" subtitle="未来 2 小时需求预测、故障风险与动态定价" />
          <div className="heat-map">
            {Array.from({ length: 72 }, (_, index) => (
              <span key={index} className={`heat-cell level-${(index * 7 + Math.floor(index / 3)) % 5}`} />
            ))}
          </div>
        </div>
        <div className="ops-recommend">
          <PanelHeader icon={Sparkles} title="运营 Agent 建议" subtitle="可解释策略，而非黑箱调价" />
          <div className="ops-action">
            <CircleDollarSign size={20} />
            <div>
              <strong>虹桥东站 20:00-21:30 上调服务费 0.08 元/kWh</strong>
              <p>需求预测超过站点容量 31%，建议同步推送昆山南站优惠券做分流。</p>
            </div>
          </div>
          <div className="ops-action warning">
            <Wrench size={20} />
            <div>
              <strong>G2 阳澄湖站 3 号桩优先巡检</strong>
              <p>握手失败率连续 4 小时高于均值，影响排队预测可信度。</p>
            </div>
          </div>
        </div>
      </section>
      <section className="ops-table">
        {opsStations.map((station) => (
          <div className="ops-row" key={station.name}>
            <div>
              <strong>{station.name}</strong>
              <span>负载 {station.load}% · 需求 {station.demand}</span>
            </div>
            <Progress value={station.load} />
            <span>¥{station.price}/kWh</span>
            <span className={station.fault === '高' ? 'danger-badge' : station.fault === '中' ? 'warn-badge' : 'good-badge'}>
              {station.fault}风险
            </span>
            <button className="text-button">
              {station.action}
              <ChevronRight size={16} />
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}

function FleetView() {
  return (
    <div className="view-stack">
      <section className="fleet-layout">
        <div className="fleet-board">
          <PanelHeader icon={Users} title="新能源车队补能排班" subtitle="任务 ETA、SOC、安全冗余与站点容量联动" />
          {fleetVehicles.map((vehicle) => (
            <div className="fleet-row" key={vehicle.plate}>
              <div className="vehicle-id">
                <Car size={18} />
                <div>
                  <strong>{vehicle.plate}</strong>
                  <span>{vehicle.driver}</span>
                </div>
              </div>
              <div className="fleet-task">
                <span>{vehicle.task}</span>
                <em>ETA {vehicle.eta}</em>
              </div>
              <div className="soc-pill">
                <BatteryCharging size={16} />
                {vehicle.soc}%
              </div>
              <span className={vehicle.status === '高优先级' ? 'danger-badge' : vehicle.status === '需补能' ? 'warn-badge' : 'good-badge'}>
                {vehicle.status}
              </span>
            </div>
          ))}
        </div>
        <div className="schedule-panel">
          <PanelHeader icon={Timer} title="补能时间窗" subtitle="按站点负载自动排程" />
          {['19:30', '20:00', '20:30', '21:00', '21:30'].map((time, index) => (
            <div className="schedule-row" key={time}>
              <span>{time}</span>
              <div className="schedule-track">
                <i style={{ left: `${index * 14 + 5}%`, width: `${22 + index * 4}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ModelView({ agentRun }) {
  return (
    <div className="view-stack">
      <section className="model-grid">
        <div className="analysis-panel wide">
          <PanelHeader icon={Brain} title="模型与 Agent 评估看板" subtitle="AI 产品经理需要定义的成功指标" />
          <div className="eval-grid">
            {evalCases.map((item) => (
              <div className="eval-card" key={item.name}>
                <span>{item.name}</span>
                <div>
                  <strong>{item.current}</strong>
                  <em>基线 {item.baseline}</em>
                </div>
                <b className={item.status === '通过' ? 'good-badge' : 'warn-badge'}>{item.status}</b>
              </div>
            ))}
          </div>
        </div>
        <div className="analysis-panel">
          <PanelHeader icon={DatabaseZap} title="工具 Schema" subtitle="Agent 可调用能力边界" />
          {agentRun.steps.slice(1, 5).map((step) => (
            <div className="schema-row" key={step.tool}>
              <TerminalSquare size={16} />
              <div>
                <strong>{step.tool}</strong>
                <span>{step.agent}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="prompt-panel">
        <PanelHeader icon={FileCheck} title="决策解释输出" subtitle="DeepSeek 接入后会替换为模型生成的解释" />
        <div className="explanation-box">
          {(agentRun.llmExplanation ? [agentRun.llmExplanation] : agentRun.decision.explanation).map((line, index) => (
            <p key={`${line}-${index}`}>{line}</p>
          ))}
        </div>
      </section>
    </div>
  );
}

function DataView({ consents, setConsents }) {
  const rows = [
    { key: 'vehicle', title: '车辆状态数据', desc: 'SOC、里程、电池温度、胎压与能耗画像', icon: Car },
    { key: 'location', title: '位置与路线数据', desc: '导航起终点、途经站点、到站时间与绕路距离', icon: Navigation },
    { key: 'battery', title: '电池健康数据', desc: 'SOH、充放电习惯、模组温差与异常衰减', icon: BatteryCharging },
    { key: 'charging', title: '充电行为数据', desc: '充电站、价格、等待、失败原因与支付记录', icon: PlugZap },
    { key: 'thirdParty', title: '第三方运营共享', desc: '向充电运营商输出脱敏需求预测与分流建议', icon: Shield }
  ];

  return (
    <div className="view-stack">
      <section className="data-panel">
        <PanelHeader icon={LockKeyhole} title="数据权限与安全边界" subtitle="可授权、可撤回、可解释的数据治理设计" />
        {rows.map((row) => {
          const Icon = row.icon;
          return (
            <div className="consent-row" key={row.key}>
              <div className="consent-copy">
                <Icon size={18} />
                <div>
                  <strong>{row.title}</strong>
                  <span>{row.desc}</span>
                </div>
              </div>
              <button
                className={`toggle ${consents[row.key] ? 'on' : ''}`}
                onClick={() => setConsents((current) => ({ ...current, [row.key]: !current[row.key] }))}
                aria-label={row.title}
              >
                <i />
              </button>
            </div>
          );
        })}
      </section>
      <section className="policy-grid">
        <div className="policy-item">
          <ShieldCheck size={22} />
          <strong>最小必要原则</strong>
          <p>补能推荐只保留行程期间所需数据，历史位置按日聚合后脱敏。</p>
        </div>
        <div className="policy-item">
          <Eye size={22} />
          <strong>解释可追溯</strong>
          <p>每次推荐记录工具调用、约束权重、候选站点与兜底策略。</p>
        </div>
        <div className="policy-item">
          <Settings size={22} />
          <strong>人工接管</strong>
          <p>涉及支付、导航同步和车队强制调度时必须经过确认。</p>
        </div>
      </section>
    </div>
  );
}

export default App;
