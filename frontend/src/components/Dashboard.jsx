// Dashboard.jsx
import React, { useState, useEffect, useRef } from "react";
import { Pencil } from "lucide-react";
import CryptoJS from "crypto-js";
import axios from "axios";
import "./Dashboard.css";

const SECRET_KEY = "your_secret_key";

export default function Dashboard() {
  // — State —
  const [email, setEmail] = useState("");
  const [userName, setUserName] = useState("User");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [editingName, setEditingName] = useState(false);
const [newName, setNewName] = useState(userName);
const [saving, setSaving] = useState(false);
const base = "http://localhost:5000";
  const [scores, setScores] = useState({
    breach: 0,
    website: 0,
    password: 0,
    overall: 0,
  });

  const [tempMail, setTempMail] = useState(null);
  const [breachDetails, setBreachDetails] = useState([]);
  const [maliciousSites, setMaliciousSites] = useState([]);
  const [passwordRatings, setPasswordRatings] = useState([]);
  const [breachFilter, setBreachFilter] = useState("");
  const radarRef = useRef(null);
  const [radarLabelPositions, setRadarLabelPositions] = useState([]);

  const handleNameUpdate = async () => {
    try {
      setSaving(true);
      const res = await fetch(`${base}/update-name`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name: newName }),
      });
      const data = await res.json();
      if (res.ok) {
        setUserName(data.name);
        setEditingName(false);
      } else {
        alert(data.message || "Failed to update name");
      }
    } catch (err) {
      console.error(err);
      alert("Error updating name");
    } finally {
      setSaving(false);
    }
  };

  const calculateLabelPositions = () => {
    const size = 240;
    const cx = size / 2;
    const cy = size / 2;
    const maxR = size * 0.35;
    const labels = ["Breach", "Website", "Password"];
    
    return labels.map((_, i) => {
      const ang = (Math.PI * 2 / labels.length) * i - Math.PI / 2;
      return {
        x: cx + Math.cos(ang) * (maxR * 0.8),
        y: cy + Math.sin(ang) * (maxR * 0.8)
      };
    });
  };
  
  // Add this useEffect
  useEffect(() => {
    setRadarLabelPositions(calculateLabelPositions());
  }, []);

  // — Decrypt email from URL —
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const enc = params.get("data");
    if (!enc) {
      setErrorMsg("No encrypted email provided.");
      setLoading(false);
      return;
    }
    try {
      const bytes = CryptoJS.AES.decrypt(
        decodeURIComponent(enc),
        SECRET_KEY
      );
      const dec = bytes.toString(CryptoJS.enc.Utf8);
      if (!dec.includes("@")) throw new Error();
      setEmail(dec);
    } catch {
      setErrorMsg("Failed to decrypt email.");
      setLoading(false);
    }
  }, []);

  // — Fetch all data —
  const fetchAll = async () => {
    setLoading(true);
    setErrorMsg("");

    const urls = {
      name:      `${base}/get-name/${email}`,
      breachS:   `${base}/api/breach-score/${email}`,
      websiteS:  `${base}/api/website-safety-score/${email}`,
      passS:     `${base}/api/password-score/${email}`,
      overallS:  `${base}/api/overall-score/${email}`,
      tempMail:  `${base}/temp-mail/${email}`,
      breachI:   `${base}/breach-info/${email}`,
      malicious: `${base}/malicious-sites/${email}`,
      ratings:   `${base}/password-ratings/${email}`,
    };
    try {
      const [
        nameRes, brRes, wsRes, psRes, orRes,
        tmRes, biRes, msRes, prRes
      ] = await Promise.all(
        Object.values(urls).map(u => axios.get(u))
      );

      setUserName(nameRes.data.name || "User");
      setScores({
        breach:   parseFloat((brRes.data.score || 0).toFixed(1)),
        website:  parseFloat((wsRes.data.score || 0).toFixed(1)),
        password: parseFloat((psRes.data.score || 0).toFixed(1)),
        overall:  parseFloat((orRes.data.score || 0).toFixed(1)),
      });
      setTempMail(tmRes.data || null);

      const breaches = Array.isArray(biRes.data) ? biRes.data : [biRes.data];
      setBreachDetails(breaches);

      setMaliciousSites(msRes.data.maliciousSites || []);
      setPasswordRatings(prRes.data.domainRatings || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
      setErrorMsg("Error loading dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  // — On email load, fetch —
  useEffect(() => {
    if (email) fetchAll();
  }, [email]);

  // — Draw radar chart —
  useEffect(() => {
    if (!radarRef.current) return;
    const ctx = radarRef.current.getContext("2d");
    const size = 240;
    const cx = size / 2,
          cy = size / 2,
          maxR = size * 0.35;
    ctx.clearRect(0, 0, size, size);

    // grid rings
    ctx.strokeStyle = "var(--c-light)";
    ctx.lineWidth = 1;
    for (let i = 1; i <= 4; i++) {
      ctx.beginPath();
      ctx.arc(cx, cy, (maxR / 4) * i, 0, 2 * Math.PI);
      ctx.stroke();
    }

    // axes & labels
    const labels = ["Breach", "Website", "Password"];
    const vals = [
      scores.breach,
      scores.website,
      scores.password,
    ];
ctx.fillStyle = "var(--c-muted)";
ctx.font = "12px sans-serif";
ctx.textAlign = "center";
ctx.textBaseline = "middle"; // 👈 this aligns vertically from center

labels.forEach((lab, i) => {
  const ang = (Math.PI * 2 / labels.length) * i - Math.PI / 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(ang) * maxR, cy + Math.sin(ang) * maxR);
  ctx.stroke();

  ctx.fillStyle = "var(--c-muted)";
  ctx.font = "12px sans-serif";
  ctx.textAlign = "center";

  // Calculate base x/y
  const baseX = cx + Math.cos(ang) * (maxR + 20);
  const baseY = cy + Math.sin(ang) * (maxR + 20);

  // Apply a small vertical shift if it's the top label
  const y = i === 0 ? baseY + 10 : baseY;

  ctx.fillText(lab, baseX, y);
});



    // data polygon
    ctx.beginPath();
    vals.forEach((v, i) => {
      const ang = (Math.PI * 2 / labels.length) * i - Math.PI / 2;
      const r = (Math.min(v, 100) / 100) * maxR;
      const x = cx + Math.cos(ang) * r,
            y = cy + Math.sin(ang) * r;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = "rgba(30,144,255,0.25)";
    ctx.fill();
    ctx.strokeStyle = "var(--c-primary)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [scores]);
  
  // — Dedup malicious sites & count visits —
  const dedupMal = (() => {
    const map = {};
    maliciousSites.forEach(item => {
      const d = item.domain;
      if (!map[d]) {
        map[d] = { ...item, visits: 1 };
      } else {
        map[d].visits += 1;
        if (new Date(item.checkedAt) > new Date(map[d].checkedAt)) {
          map[d] = { ...item, visits: map[d].visits };
        }
      }
    });
    return Object.values(map);
  })();

  // — Sort password ratings descending —
  const sortedRatings = [...passwordRatings].sort((a, b) => b.rating - a.rating);

  // — Filtered breaches —
  const filteredBreaches = breachDetails.filter(b =>
    b.breachedSite.toLowerCase().includes(breachFilter.toLowerCase())
  );

  // — Loading / Error —
  if (loading)
    return (
      <div className="lightdash-root">
        <div className="ld-loading">Loading dashboard…</div>
      </div>
    );
  if (errorMsg)
    return (
      <div className="lightdash-root">
        <div className="ld-error">{errorMsg}</div>
      </div>
    );

  // — Render —
  return (
    <div className="lightdash-root">
      {/* HEADER */}
      <header className="ld-header">
  <div className="ld-avatar">{userName.charAt(0)}</div>

  <div className="ld-userinfo">
    <h1 className="ld-name">
      Hello,
      {editingName ? (
        <>
          <input
            className="ld-edit-name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <button onClick={handleNameUpdate} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
          <button onClick={() => setEditingName(false)}>Cancel</button>
        </>
      ) : (
        <>
          <span>{userName}</span>
          <button
            onClick={() => setEditingName(true)}
            className="ld-pen"
            title="Edit name"
          >
            <Pencil size={14} />
          </button>
        </>
      )}
    </h1>

    <p className="ld-email">{email}</p>

    {lastUpdated && (
      <p className="ld-updated">
        Last refreshed: {lastUpdated.toLocaleString()}
      </p>
    )}
  </div>

  <button className="ld-refresh" onClick={fetchAll}>
    Refresh
  </button>
</header>
      {/* GAUGES */}
      <section className="ld-section ld-gauges">
        <Gauge pct={scores.breach}   label="Breach Score"      color="var(--c-danger)" />
        <Gauge pct={scores.website}  label="Website Safety"     color="var(--c-success)" />
        <Gauge pct={scores.password} label="Password Strength"  color="var(--c-info)" />
        <Gauge pct={scores.overall}  label="Overall Score"      color="var(--c-accent)" />
      </section>

      <div className="ld-side-by-side">
  {/* TEMP MAIL */}
  {tempMail && (
    <section className="ld-section ld-section-1 ld-temp">
      <h2>Temporary Email</h2>
      <div className="ld-temp-details">
        <div><strong>Email:</strong> <code>{tempMail.tempMail}</code></div>
        <div><strong>Status:</strong> {tempMail.expired ? "Expired" : "Active"}</div>
        <div><strong>Created:</strong> {new Date(tempMail.createdAt).toLocaleString()}</div>
        <div><strong>Expires At:</strong> {new Date(tempMail.expiresAt).toLocaleString()}</div>
      </div>
    </section>
  )}

  {/* RADAR */}
  <section className="ld-section ld-radar-wrap">
  <h2>Security Radar</h2>
  <div className="ld-radar-container">
    <canvas ref={radarRef} width="240" height="240" className="ld-radar" />
    <div className="ld-radar-scores">
      {radarLabelPositions.map((pos, i) => (
        <div
          key={i}
          className="ld-radar-score"
          style={{
            left: `${pos.x}px`,
            top: `${pos.y}px`,
          }}
        >
          {[scores.breach, scores.website, scores.password][i].toFixed(1)}%
        </div>
      ))}
    </div>
  </div>
</section>
</div>



      {/* MALICIOUS SITES */}
      <section className="ld-section ld-malicious">
        <h2>Malicious Sites</h2>
        {dedupMal.length ? (
          <ul>
            {dedupMal.map((m, i) => (
              <li key={i} title={`Checked ${m.visits} times`}>
                <span className="ld-domain">{m.domain}</span>
                <span className="ld-meta">
                 <b> Last Visted: </b>{new Date(m.checkedAt).toLocaleDateString()} &middot;<b> Total visits:</b>{" "}
                  {m.visits}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p>No malicious sites found.</p>
        )}
      </section>

      {/* PASSWORD RATINGS */}
      <section className="ld-section ld-passratings">
        <h2>Password Ratings</h2>
        {sortedRatings.length ? (
          <table>
            <thead>
              <tr>
                <th>Domain</th>
                <th>Rating</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {sortedRatings.map((r, i) => (
                <tr key={i}>
                  <td>{r.domain}</td>
                  <td>{r.rating.toFixed(1)}</td>
                  <td>{new Date(r.updatedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No password ratings.</p>
        )}
      </section>

      {/* BREACH INFO */}
      <section className="ld-section ld-breaches">
        <h2>Breach Information</h2>
        <input
          type="text"
          className="ld-filter"
          placeholder="Filter by site..."
          value={breachFilter}
          onChange={e => setBreachFilter(e.target.value)}
          
        />

        {filteredBreaches.length ? (
          <table>
            <thead>
              <tr>

                <th>Site</th>
                <th>Leaked Data</th>
                <th>Email</th>
                <th>Year</th>
              </tr>
            </thead>
            <tbody>
              {filteredBreaches.map((b, i) => (
                <tr key={i}>
                  

                  <td>{b.breachedSite}</td>
                  <td>{b.leakedData.join(", ")}</td>
                  <td>{b.userEmail || email}</td>
                  <td>{new Date(b.breachDate).getFullYear()}</td>
                </tr>
              ))}
            </tbody>
          </table>
           
        ) : (
          <p>No breaches match your filter.</p>
        )}
      </section>
      
    </div>
  );
}

// — Gauge Component —
function Gauge({ pct, label, color }) {
  const radius = 50,
        stroke = 8;
  const p = Math.min(100, Math.max(0, pct));
  const display = p.toFixed(1);
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - p / 100);

  return (
    <div className="ld-gauge">
      <svg width={2 * (radius + stroke)} height={2 * (radius + stroke)}>
        <circle
          className="ld-gauge-bg"
          stroke="var(--c-light)"
          strokeWidth={stroke}
          fill="none"
          cx={radius + stroke}
          cy={radius + stroke}
          r={radius}
        />
        <circle
          className="ld-gauge-fg"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          cx={radius + stroke}
          cy={radius + stroke}
          r={radius}
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
        <text
          x="50%"
          y="50%"
          dy="0.3em"
          textAnchor="middle"
          className="ld-gauge-txt"
        >
          {display}%
        </text>
      </svg>
      <div className="ld-gauge-label">{label}</div>
    </div>
  );
}
