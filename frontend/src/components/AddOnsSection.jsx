import React, { useEffect, useState } from 'react';
import { getAddOns } from '../services/api';

const TABS = [
  { key: 'meal', label: 'Meals' },
  { key: 'baggage', label: 'Excess Baggage' }
];

// selected/setSelected: array of add-on objects the parent is tracking.
const AddOnsSection = ({ selected, setSelected }) => {
  const [tab, setTab] = useState('meal');
  const [addons, setAddons] = useState([]);
  const [veg, setVeg] = useState(null);

  useEffect(() => {
    const params = { type: tab };
    if (tab === 'meal' && veg !== null) params.veg = veg;
    getAddOns(params)
      .then(res => setAddons(res.data.addons || []))
      .catch(() => setAddons([]));
  }, [tab, veg]);

  const safeSelected = Array.isArray(selected) ? selected : [];

  const toggleAdd = (item) => {
    const exists = safeSelected.find(i => i._id === item._id);
    setSelected(exists ? safeSelected.filter(i => i._id !== item._id) : [...safeSelected, item]);
  };

  const tabBtn = (active) => ({
    padding: '8px 16px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600,
    fontFamily: 'inherit', cursor: 'pointer',
    background: active ? '#0ea5e9' : '#f1f5f9', color: active ? 'white' : '#64748b'
  });

  const filterBtn = (active, color) => ({
    padding: '6px 14px', borderRadius: 999, border: `1.5px solid ${active ? color : '#e2e8f0'}`,
    fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
    background: active ? `${color}18` : 'white', color: active ? color : '#64748b'
  });

  return (
    <div className="card" style={{ padding: 20 }}>
      <h3 style={{ fontSize: 16, marginBottom: 14 }}>Add-ons</h3>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {TABS.map(t => (
          <button key={t.key} style={tabBtn(tab === t.key)} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {tab === 'meal' && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button style={filterBtn(veg === true, '#10b981')} onClick={() => setVeg(true)}>● Veg</button>
          <button style={filterBtn(veg === false, '#ef4444')} onClick={() => setVeg(false)}>● Non-Veg</button>
          <button style={filterBtn(veg === null, '#64748b')} onClick={() => setVeg(null)}>All</button>
        </div>
      )}

      {addons.length === 0 && (
        <p style={{ fontSize: 13, color: '#94a3b8' }}>No {tab} add-ons available right now.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {addons.map(item => {
          const isSelected = !!safeSelected.find(i => i._id === item._id);
          return (
            <div
              key={item._id}
              style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '10px 14px',
                borderRadius: 10, border: `1.5px solid ${isSelected ? '#0ea5e9' : '#e2e8f0'}`,
                background: isSelected ? '#f0f9ff' : 'white'
              }}
            >
              {item.type === 'meal' ? (
                <span
                  style={{
                    width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                    background: item.veg ? '#10b981' : '#ef4444'
                  }}
                  title={item.veg ? 'Veg' : 'Non-Veg'}
                />
              ) : (
                <div style={{
                  width: 40, height: 32, borderRadius: 8, background: '#f1f5f9',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, color: '#0f172a', flexShrink: 0
                }}>
                  {item.baggageWeight}kg
                </div>
              )}

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{item.name}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>₹{item.price} · {item.description}</div>
              </div>

              <button
                onClick={() => toggleAdd(item)}
                className={isSelected ? 'btn btn-outline' : 'btn btn-primary'}
                style={{ fontSize: 12, padding: '6px 14px' }}
              >
                {isSelected ? 'Added ✓' : 'Add'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AddOnsSection;
