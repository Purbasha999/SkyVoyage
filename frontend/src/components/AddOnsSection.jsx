import React, { useEffect, useState } from 'react';
import { getAddOns } from '../services/api';
import './AddOnsSection.css';

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

  return (
    <div className="addons-container card">
      <h3 className="sc-title">Add-ons</h3>

      <div className="addons-tabs">
        {TABS.map(t => (
          <button key={t.key} className={tab === t.key ? 'active' : ''} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {tab === 'meal' && (
        <div className="addons-filter">
          <button className={`filter-btn ${veg === true ? 'active veg' : ''}`} onClick={() => setVeg(true)}>
            <span className="dot veg" /> Veg
          </button>
          <button className={`filter-btn ${veg === false ? 'active nonveg' : ''}`} onClick={() => setVeg(false)}>
            <span className="dot nonveg" /> Non-Veg
          </button>
          <button className={`filter-btn ${veg === null ? 'active' : ''}`} onClick={() => setVeg(null)}>All</button>
        </div>
      )}

      {addons.length === 0 && <p style={{ fontSize: 13, color: 'var(--gray-400)' }}>No {tab} add-ons available right now.</p>}

      <div className="addons-list">
        {addons.map(item => {
          const isSelected = !!safeSelected.find(i => i._id === item._id);
          return (
            <div key={item._id} className={`addon-row ${isSelected ? 'selected' : ''}`}>
              <div className="addon-img-wrap">
                {item.type === 'meal' ? (
                  <>
                    <img src={item.image} alt="" />
                    <span className={`veg-dot ${item.veg ? 'veg' : 'nonveg'}`} />
                  </>
                ) : (
                  <div className="baggage-box">{item.baggageWeight}kg</div>
                )}
              </div>

              <div className="addon-info">
                <div className="addon-name">{item.name}</div>
                <div className="addon-price">₹{item.price}</div>
                <div className="addon-more">{item.description}</div>
              </div>

              <button className={`addon-btn ${isSelected ? 'added' : ''}`} onClick={() => toggleAdd(item)}>
                {isSelected ? 'Added' : 'Add'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AddOnsSection;
