import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import pg from 'pg';

dotenv.config();

const app = express();
const { Pool } = pg;

function createPool() {
  if (!process.env.DATABASE_URL) return null;

  const connectionUrl = new URL(process.env.DATABASE_URL);
  connectionUrl.searchParams.delete('sslmode');
  return new Pool({
    connectionString: connectionUrl.toString(),
    max: 3,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 8000,
    ssl: { rejectUnauthorized: false }
  });
}

const pool = createPool();
const configuredOrigins = (process.env.FRONTEND_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);
const localOrigins = ['http://127.0.0.1:5190', 'http://localhost:5190'];
const allowedOrigins = new Set(configuredOrigins.length ? configuredOrigins : localOrigins);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin.replace(/\/$/, ''))) return callback(null, true);
    return callback(new Error('Origin is not allowed by VoltPilot CORS policy'));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json({ limit: '1mb' }));

async function queryDatabase(text, values = []) {
  if (!pool) throw new Error('DATABASE_URL is not configured');
  return pool.query(text, values);
}

const baseStations = [
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
    amenities: ['休息区', '卫生间', '咖啡']
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
    amenities: ['便利店', '雨棚']
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
    amenities: ['商场', '休息区', '餐饮']
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
    amenities: ['高速服务区']
  }
];

const defaultVehicle = {
  model: 'SUV 75kWh 后驱长续航',
  soc: 42,
  soh: 91.8,
  batteryTemp: 18,
  odometerKm: 46320,
  avgConsumption: 15.8,
  fastChargeRatio: 38,
  tirePressureOk: true
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function buildAgentRun(payload = {}) {
  const prompt = payload.prompt || '今晚 19:30 从苏州到上海虹桥，要求少排队、成本低';
  const vehicle = { ...defaultVehicle, ...(payload.vehicle || {}) };
  const weights = {
    time: Number(payload.weights?.time ?? 42),
    cost: Number(payload.weights?.cost ?? 32),
    batterySafety: Number(payload.weights?.batterySafety ?? 26)
  };

  const departureHour = /19|晚|夜/.test(prompt) ? 19 : 9;
  const weatherFactor = /雨|冷|冬|低温/.test(prompt) ? 1.13 : 1.04;
  const speedFactor = /高速|赶/.test(prompt) ? 1.08 : 1.02;
  const routeKm = /杭州/.test(prompt) ? 164 : /南京/.test(prompt) ? 218 : 106;
  const estimatedKwh = Number(((routeKm / 100) * vehicle.avgConsumption * weatherFactor * speedFactor).toFixed(1));
  const socDrop = Math.round((estimatedKwh / 75) * 100);
  const arrivalWithoutCharge = clamp(vehicle.soc - socDrop, 2, 100);

  const scoredStations = baseStations.map((station) => {
    const arrivalSoc = clamp(vehicle.soc - Math.round((station.distanceKm / routeKm) * socDrop), 3, 100);
    const neededSoc = clamp(24 - arrivalWithoutCharge + 12, 12, 38);
    const energyAddedKwh = Number((neededSoc * 0.75).toFixed(1));
    const effectivePowerKw = Math.min(station.powerKw * 0.34, 180);
    const chargeMinutes = Math.ceil((energyAddedKwh / effectivePowerKw) * 60 + 8);
    const timeScore = 100 - station.queueMinutes - station.detourKm * 5 - chargeMinutes * 0.45;
    const costScore = 100 - station.price * 28;
    const safetyScore = arrivalSoc * 1.15 - station.faultRisk * 130 + station.available * 2;
    const weightedScore =
      timeScore * (weights.time / 100) +
      costScore * (weights.cost / 100) +
      safetyScore * (weights.batterySafety / 100);

    return {
      ...station,
      score: Number(weightedScore.toFixed(1)),
      arrivalSoc,
      energyAddedKwh,
      chargeMinutes,
      targetSoc: clamp(arrivalSoc + neededSoc, 20, 82),
      finalSoc: clamp(arrivalWithoutCharge + neededSoc, 14, 62)
    };
  }).sort((a, b) => b.score - a.score);

  const best = scoredStations[0];
  const second = scoredStations[1];
  const now = new Date();
  const runId = `VP-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getTime()).slice(-5)}`;

  const steps = [
    {
      id: 'intent',
      title: '理解用户目标',
      agent: 'Intent Agent',
      status: 'done',
      durationMs: 340,
      tool: 'nlp.extract_trip_constraints',
      output: {
        origin: '苏州工业园区',
        destination: /杭州/.test(prompt) ? '杭州西湖区' : /南京/.test(prompt) ? '南京南站' : '上海虹桥',
        preference: ['少排队', '成本低', '到达电量安全'],
        departureHour
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
        soc: `${vehicle.soc}%`,
        soh: `${vehicle.soh}%`,
        batteryTemp: `${vehicle.batteryTemp}°C`,
        avgConsumption: `${vehicle.avgConsumption} kWh/100km`
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
        routeKm,
        estimatedKwh,
        socDrop: `${socDrop}%`,
        arrivalWithoutCharge: `${arrivalWithoutCharge}%`
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
        candidates: scoredStations.length,
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
        weights,
        selected: best.name,
        score: best.score,
        alternative: second.name
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

  return {
    runId,
    prompt,
    mode: process.env.DEEPSEEK_API_KEY ? 'deepseek-ready' : 'mock',
    summary: `建议在${best.name}补能 ${best.chargeMinutes} 分钟，预计等待 ${best.queueMinutes} 分钟，到达目的地剩余 ${best.finalSoc}% 电量。`,
    decision: {
      selectedStationId: best.id,
      selectedStation: best.name,
      chargeMinutes: best.chargeMinutes,
      expectedQueueMinutes: best.queueMinutes,
      targetSoc: best.targetSoc,
      finalSoc: best.finalSoc,
      estimatedCost: Number((best.energyAddedKwh * best.price).toFixed(1)),
      riskLevel: best.faultRisk < 0.05 ? '低' : best.faultRisk < 0.1 ? '中' : '高',
      explanation: [
        `${best.name}在当前权重下综合得分 ${best.score}，排队时间和故障风险都低于沿途均值。`,
        `最近的 G2 服务区虽然绕路少，但预计等待 24 分钟且故障风险更高，不符合“少排队”的目标。`,
        `补能到 ${best.targetSoc}% 后，到达目的地预计保留 ${best.finalSoc}% 电量，满足安全冗余。`
      ]
    },
    stations: scoredStations,
    telemetry: {
      vehicle,
      routeKm,
      estimatedKwh,
      socDrop,
      arrivalWithoutCharge,
      weatherFactor,
      speedFactor
    },
    steps
  };
}

async function callDeepSeek(run) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return null;

  const baseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 18000);
  let response;

  try {
    response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        temperature: 0.35,
        messages: [
          {
            role: 'system',
            content:
              '你是 VoltPilot 新能源汽车补能与电池健康 AI 产品中的决策解释 Agent。只基于给定 JSON 输出面向车主的简洁中文解释，包含推荐理由、风险兜底、确认动作。'
          },
          {
            role: 'user',
            content: JSON.stringify({
              userGoal: run.prompt,
              decision: run.decision,
              topStations: run.stations.slice(0, 3),
              telemetry: run.telemetry
            })
          }
        ]
      })
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`DeepSeek API ${response.status}: ${detail.slice(0, 240)}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || null;
}

async function healthHandler(req, res) {
  let database = process.env.DATABASE_URL ? 'postgres' : 'not_configured';
  let databaseConnected = false;
  let caseCount = 0;
  let databaseError = null;

  try {
    const result = await queryDatabase(`
      select
        current_database() as database,
        (select count(*)::int from agent_runs) as case_count
    `);
    database = result.rows[0].database;
    caseCount = result.rows[0].case_count;
    databaseConnected = true;
  } catch (error) {
    databaseError = error.message;
  }

  res.status(databaseConnected || !process.env.DATABASE_URL ? 200 : 503).json({
    ok: databaseConnected && Boolean(process.env.DEEPSEEK_API_KEY),
    database,
    database_connected: databaseConnected,
    deepseek_configured: Boolean(process.env.DEEPSEEK_API_KEY),
    deepseekConfigured: Boolean(process.env.DEEPSEEK_API_KEY),
    case_count: caseCount,
    model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
    database_error: databaseError
  });
}

async function agentHandler(req, res) {
  const run = buildAgentRun(req.body);
  let llmExplanation = null;
  let apiError = null;

  try {
    llmExplanation = await callDeepSeek(run);
  } catch (error) {
    apiError = error.message;
  }

  const response = {
    ...run,
    mode: llmExplanation ? 'deepseek' : apiError ? 'mock-with-api-error' : run.mode,
    fallback: !llmExplanation,
    apiError,
    llmExplanation
  };

  try {
    await queryDatabase(
      `insert into agent_runs (id, prompt, mode, summary, fallback, payload)
       values ($1, $2, $3, $4, $5, $6::jsonb)
       on conflict (id) do update set
         mode = excluded.mode,
         summary = excluded.summary,
         fallback = excluded.fallback,
         payload = excluded.payload`,
      [run.runId, run.prompt, response.mode, run.summary, response.fallback, JSON.stringify(response)]
    );
  } catch (error) {
    response.databaseError = error.message;
  }

  res.status(200).json(response);
}

app.get(['/health', '/api/health'], healthHandler);
app.post(['/agent', '/api/agent'], agentHandler);

app.use((error, req, res, next) => {
  if (error.message?.includes('CORS policy')) {
    return res.status(403).json({ ok: false, error: error.message });
  }
  return next(error);
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({
    ok: false,
    error: 'VoltPilot API internal error'
  });
});

export default app;
