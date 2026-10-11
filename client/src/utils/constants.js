export const STATIONS = {
  BHARATI: {
    id: 'BHARATI', name: 'Bharati Station',
    lat: -69.4072, lon: 76.1872,
    established: 2012, crew: 25,
    description: 'Located at Larsemann Hills, East Antarctica',
    rooms: [
      { id: 'GEN_ROOM', name: 'Generator Room', x: 50, y: 60, w: 160, h: 110,
        equipment: [
          { id: 'GEN_01', name: 'Generator 01', x: 90, y: 100 },
          { id: 'GEN_02', name: 'Generator 02', x: 160, y: 100 }
        ]
      },
      { id: 'FUEL_STORE', name: 'Fuel Storage', x: 230, y: 60, w: 130, h: 110,
        equipment: [
          { id: 'FUEL_TANK_01', name: 'Fuel Tank A', x: 265, y: 105 },
          { id: 'FUEL_TANK_02', name: 'Fuel Tank B', x: 315, y: 105 }
        ]
      },
      { id: 'HVAC_ROOM', name: 'HVAC / Heating', x: 50, y: 190, w: 130, h: 100,
        equipment: [
          { id: 'HVAC_01', name: 'HVAC Unit', x: 115, y: 240 }
        ]
      },
      { id: 'BATTERY_ROOM', name: 'Battery Bank', x: 200, y: 190, w: 110, h: 100,
        equipment: [
          { id: 'BATT_01', name: 'Battery Bank', x: 255, y: 240 }
        ]
      },
      { id: 'LIFE_SUPPORT', name: 'Life Support', x: 330, y: 190, w: 130, h: 100,
        equipment: [
          { id: 'WATER_01', name: 'Water Filter', x: 365, y: 225 },
          { id: 'STP_01', name: 'STP Unit', x: 415, y: 225 }
        ]
      },
      { id: 'LIVING_QUARTERS', name: 'Living Quarters', x: 50, y: 310, w: 220, h: 110, equipment: [] },
      { id: 'COMMS_ROOM', name: 'Communications', x: 290, y: 310, w: 170, h: 110,
        equipment: [
          { id: 'VSAT_01', name: 'VSAT Terminal', x: 375, y: 365 }
        ]
      }
    ]
  },
  MAITRI: {
    id: 'MAITRI', name: 'Maitri Station',
    lat: -70.7667, lon: 11.7333,
    established: 1989, crew: 25,
    description: 'Located at Schirmacher Oasis, East Antarctica',
    rooms: [
      { id: 'GEN_ROOM', name: 'Generator Room', x: 50, y: 60, w: 160, h: 110,
        equipment: [
          { id: 'GEN_01', name: 'Generator 01', x: 90, y: 100 },
          { id: 'GEN_02', name: 'Generator 02', x: 160, y: 100 }
        ]
      },
      { id: 'FUEL_STORE', name: 'Fuel Storage', x: 230, y: 60, w: 130, h: 110,
        equipment: [
          { id: 'FUEL_TANK_01', name: 'Fuel Tank A', x: 265, y: 105 },
          { id: 'FUEL_TANK_02', name: 'Fuel Tank B', x: 315, y: 105 }
        ]
      },
      { id: 'HVAC_ROOM', name: 'HVAC / Heating', x: 50, y: 190, w: 130, h: 100,
        equipment: [
          { id: 'HVAC_01', name: 'HVAC Unit', x: 115, y: 240 }
        ]
      },
      { id: 'BATTERY_ROOM', name: 'Battery Bank', x: 200, y: 190, w: 110, h: 100,
        equipment: [
          { id: 'BATT_01', name: 'Battery Bank', x: 255, y: 240 }
        ]
      },
      { id: 'LIFE_SUPPORT', name: 'Life Support', x: 330, y: 190, w: 130, h: 100,
        equipment: [
          { id: 'WATER_01', name: 'Water Filter', x: 365, y: 225 },
          { id: 'STP_01', name: 'STP Unit', x: 415, y: 225 }
        ]
      },
      { id: 'LIVING_QUARTERS', name: 'Living Quarters', x: 50, y: 310, w: 220, h: 110, equipment: [] },
      { id: 'COMMS_ROOM', name: 'Communications', x: 290, y: 310, w: 170, h: 110,
        equipment: [
          { id: 'VSAT_01', name: 'VSAT Terminal', x: 375, y: 365 }
        ]
      }
    ]
  }
};

export const ALERT_LEVELS = {
  normal: { color: '#22c55e', label: 'Normal' },
  warning: { color: '#f59e0b', label: 'Warning' },
  critical: { color: '#ef4444', label: 'Critical' }
};

export const THRESHOLDS = {
  vibration: { warning: 3.5, critical: 5.0 },
  fuel_liters: { warning: 5000, critical: 2000 },
  battery_soc: { warning: 30, critical: 15 },
  failure_risk: { warning: 0.4, critical: 0.7 }
};

export const API_BASE = 'http://localhost:8000';
export const WS_URL = 'ws://localhost:8000/ws/telemetry';
