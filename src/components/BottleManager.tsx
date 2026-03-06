import { useState } from "react";
import { bottleRegistry } from "../data/bottleRegistry";
import type { BottleEntry, BottleGeometry } from "../data/bottleRegistry";
import "./BottleManager.css";

const STORAGE_KEY = "afia_custom_bottles";

export function BottleManager() {
  const [customBottles, setCustomBottles] = useState<BottleEntry[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  });
  const [isAdding, setIsAdding] = useState(false);
  const [editingBottle, setEditingBottle] = useState<BottleEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const allBottles = [...bottleRegistry, ...customBottles];

  const filteredBottles = allBottles.filter((bottle) =>
    bottle.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bottle.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSave = (bottle: BottleEntry) => {
    if (editingBottle) {
      // Update existing
      setCustomBottles((prev) =>
        prev.map((b) => (b.sku === editingBottle.sku ? bottle : b))
      );
    } else {
      // Add new
      setCustomBottles((prev) => [...prev, bottle]);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customBottles));
    setIsAdding(false);
    setEditingBottle(null);
  };

  const handleDelete = (sku: string) => {
    if (confirm("Are you sure you want to delete this bottle?")) {
      setCustomBottles((prev) => prev.filter((b) => b.sku !== sku));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customBottles.filter((b) => b.sku !== sku)));
    }
  };

  return (
    <div className="bottle-manager">
      <header className="manager-header">
        <h3>Bottle Registry</h3>
        <button
          className="btn btn-primary"
          onClick={() => setIsAdding(true)}
        >
          + Add Bottle
        </button>
      </header>

      <input
        type="text"
        className="search-input"
        placeholder="Search bottles..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      <div className="bottles-list">
        {filteredBottles.map((bottle) => (
          <BottleCard
            key={bottle.sku}
            bottle={bottle}
            isCustom={customBottles.some((b) => b.sku === bottle.sku)}
            onEdit={() => setEditingBottle(bottle)}
            onDelete={() => handleDelete(bottle.sku)}
          />
        ))}
      </div>

      {(isAdding || editingBottle) && (
        <BottleForm
          bottle={editingBottle}
          onSave={handleSave}
          onCancel={() => {
            setIsAdding(false);
            setEditingBottle(null);
          }}
        />
      )}
    </div>
  );
}

// Bottle Card Component
interface BottleCardProps {
  bottle: BottleEntry;
  isCustom: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

function BottleCard({ bottle, isCustom, onEdit, onDelete }: BottleCardProps) {
  return (
    <div className="bottle-card">
      <div className="bottle-card-header">
        <h4>{bottle.name}</h4>
        {!isCustom && <span className="builtin-badge">Built-in</span>}
      </div>

      <div className="bottle-details">
        <div className="detail-row">
          <span className="label">SKU:</span>
          <span className="value">{bottle.sku}</span>
        </div>
        <div className="detail-row">
          <span className="label">Oil Type:</span>
          <span className="value">{bottle.oilType.replace(/_/g, " ")}</span>
        </div>
        <div className="detail-row">
          <span className="label">Capacity:</span>
          <span className="value">{bottle.totalVolumeMl}ml</span>
        </div>
        <div className="detail-row">
          <span className="label">Shape:</span>
          <span className="value">{bottle.geometry.shape}</span>
        </div>
        {bottle.geometry.shape === "cylinder" ? (
          <div className="detail-row">
            <span className="label">Dimensions:</span>
            <span className="value">
              H: {bottle.geometry.heightMm}mm, D: {bottle.geometry.diameterMm}mm
            </span>
          </div>
        ) : (
          <>
            <div className="detail-row">
              <span className="label">Height:</span>
              <span className="value">{bottle.geometry.heightMm}mm</span>
            </div>
            <div className="detail-row">
              <span className="label">Top Diameter:</span>
              <span className="value">{bottle.geometry.topDiameterMm}mm</span>
            </div>
            <div className="detail-row">
              <span className="label">Bottom Diameter:</span>
              <span className="value">{bottle.geometry.bottomDiameterMm}mm</span>
            </div>
          </>
        )}
      </div>

      {isCustom && (
        <div className="bottle-actions">
          <button className="btn btn-sm btn-outline" onClick={onEdit}>
            Edit
          </button>
          <button className="btn btn-sm btn-danger" onClick={onDelete}>
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

// Bottle Form Component
interface BottleFormProps {
  bottle: BottleEntry | null;
  onSave: (bottle: BottleEntry) => void;
  onCancel: () => void;
}

function BottleForm({ bottle, onSave, onCancel }: BottleFormProps) {
  const [formData, setFormData] = useState<Partial<BottleEntry>>({
    sku: bottle?.sku || "",
    name: bottle?.name || "",
    oilType: bottle?.oilType || "extra_virgin_olive",
    totalVolumeMl: bottle?.totalVolumeMl || 500,
    geometry: bottle?.geometry || {
      shape: "cylinder",
      heightMm: 220,
      diameterMm: 65,
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.sku || !formData.name || !formData.totalVolumeMl) {
      alert("Please fill in all required fields");
      return;
    }
    onSave(formData as BottleEntry);
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content bottle-form" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h3>{bottle ? "Edit Bottle" : "Add New Bottle"}</h3>
          <button className="modal-close" onClick={onCancel}>×</button>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="sku">SKU *</label>
            <input
              id="sku"
              type="text"
              required
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              placeholder="e.g., filippo-berio-500ml"
            />
          </div>

          <div className="form-group">
            <label htmlFor="name">Bottle Name *</label>
            <input
              id="name"
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Filippo Berio Extra Virgin Olive Oil"
            />
          </div>

          <div className="form-group">
            <label htmlFor="oilType">Oil Type *</label>
            <select
              id="oilType"
              value={formData.oilType}
              onChange={(e) => setFormData({ ...formData, oilType: e.target.value })}
            >
              <option value="extra_virgin_olive">Extra Virgin Olive Oil</option>
              <option value="pure_olive">Pure Olive Oil</option>
              <option value="sunflower">Sunflower Oil</option>
              <option value="vegetable">Vegetable Oil</option>
              <option value="canola">Canola Oil</option>
              <option value="coconut">Coconut Oil</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="capacity">Capacity (ml) *</label>
            <input
              id="capacity"
              type="number"
              required
              min="1"
              value={formData.totalVolumeMl}
              onChange={(e) =>
                setFormData({ ...formData, totalVolumeMl: parseInt(e.target.value) || 0 })
              }
            />
          </div>

          <div className="form-group">
            <label htmlFor="shape">Bottle Shape *</label>
            <select
              id="shape"
              value={formData.geometry?.shape}
              onChange={(e) => {
                const shape = e.target.value as "cylinder" | "frustum";
                setFormData({
                  ...formData,
                  geometry: shape === "cylinder"
                    ? { shape, heightMm: 220, diameterMm: 65 }
                    : { shape, heightMm: 280, topDiameterMm: 70, bottomDiameterMm: 85 },
                });
              }}
            >
              <option value="cylinder">Cylinder</option>
              <option value="frustum">Frustum (Tapered)</option>
            </select>
          </div>

          {formData.geometry?.shape === "cylinder" ? (
            <>
              <div className="form-group">
                <label htmlFor="height">Height (mm)</label>
                <input
                  id="height"
                  type="number"
                  value={formData.geometry?.heightMm || 220}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      geometry: { ...formData.geometry!, heightMm: parseInt(e.target.value) || 0 },
                    })
                  }
                />
              </div>
              <div className="form-group">
                <label htmlFor="diameter">Diameter (mm)</label>
                <input
                  id="diameter"
                  type="number"
                  value={formData.geometry?.diameterMm || 65}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      geometry: { ...formData.geometry!, diameterMm: parseInt(e.target.value) || 0 },
                    })
                  }
                />
              </div>
            </>
          ) : (
            <>
              <div className="form-group">
                <label htmlFor="height">Height (mm)</label>
                <input
                  id="height"
                  type="number"
                  value={formData.geometry?.heightMm || 280}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      geometry: { ...formData.geometry!, heightMm: parseInt(e.target.value) || 0 },
                    })
                  }
                />
              </div>
              <div className="form-group">
                <label htmlFor="topDiameter">Top Diameter (mm)</label>
                <input
                  id="topDiameter"
                  type="number"
                  value={formData.geometry?.topDiameterMm || 70}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      geometry: { ...formData.geometry!, topDiameterMm: parseInt(e.target.value) || 0 },
                    })
                  }
                />
              </div>
              <div className="form-group">
                <label htmlFor="bottomDiameter">Bottom Diameter (mm)</label>
                <input
                  id="bottomDiameter"
                  type="number"
                  value={formData.geometry?.bottomDiameterMm || 85}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      geometry: { ...formData.geometry!, bottomDiameterMm: parseInt(e.target.value) || 0 },
                    })
                  }
                />
              </div>
            </>
          )}

          <div className="form-actions">
            <button type="button" className="btn btn-outline" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {bottle ? "Save Changes" : "Add Bottle"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
