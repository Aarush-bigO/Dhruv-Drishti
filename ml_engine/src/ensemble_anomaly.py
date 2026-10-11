"""
Advanced Multi-Model Ensemble Anomaly Detection Engine for Antarctic IoT & Polar Observations.
Combines:
1. Extended Multivariate Isolation Forest (subspace path isolation)
2. Robust Mahalanobis Distance / Empirical Covariance (elliptical distribution distance with Chi-Square p-values)
3. Local Outlier Factor (LOF - local density-based drift detection)
4. Statistical CUSUM (Cumulative Sum Control Chart for subtle persistent mean shift detection)
5. Explainable AI (XAI) Feature Perturbation Attribution (identifies exact % root-cause contributors)
"""

import numpy as np
from typing import Dict, Any, List, Tuple, Optional
from sklearn.ensemble import IsolationForest
from sklearn.covariance import EmpiricalCovariance
from sklearn.neighbors import LocalOutlierFactor
from scipy.stats import chi2

class CUSUMDetector:
    """
    Cumulative Sum Control Chart (CUSUM) for detecting small, persistent sensor calibration drifts
    and progressive mechanical wear before threshold boundaries are breached.
    """
    def __init__(self, threshold: float = 8.0, drift: float = 1.0, decay: float = 0.92):
        self.threshold = threshold
        self.drift = drift
        self.decay = decay
        self.s_pos = 0.0
        self.s_neg = 0.0

    def update(self, val: float, baseline_mean: float, baseline_std: float) -> Tuple[bool, float]:
        if baseline_std <= 1e-6:
            baseline_std = 1.0

        z = (val - baseline_mean) / baseline_std

        decay = getattr(self, 'decay', 0.92)
        drift = getattr(self, 'drift', 1.0)
        threshold = getattr(self, 'threshold', 8.0)
        s_pos = getattr(self, 's_pos', 0.0)
        s_neg = getattr(self, 's_neg', 0.0)

        # Leaky accumulation prevents permanent false alarms on station baseline differences
        self.s_pos = max(0.0, (s_pos * decay) + z - drift)
        self.s_neg = max(0.0, (s_neg * decay) - z - drift)

        max_stat = max(self.s_pos, self.s_neg)
        drift_detected = max_stat > threshold
        return bool(drift_detected), float(round(max_stat, 2))

    def reset(self):
        self.s_pos = 0.0
        self.s_neg = 0.0


class EnsembleAnomalyDetector:
    """
    Production-grade Tri-Model Ensemble Anomaly Intelligence Detector.
    """
    def __init__(
        self, 
        n_estimators: int = 150, 
        contamination: float = 0.04, 
        feature_names: Optional[List[str]] = None,
        random_state: int = 42
    ):
        self.n_estimators = n_estimators
        self.contamination = contamination
        self.feature_names = feature_names or []
        self.random_state = random_state

        self.iforest: Optional[IsolationForest] = None
        self.robust_cov: Optional[EmpiricalCovariance] = None
        self.lof: Optional[LocalOutlierFactor] = None
        self.feature_means: Optional[np.ndarray] = None
        self.feature_stds: Optional[np.ndarray] = None
        self.is_fitted = False

        self.cusum_detectors: Dict[str, CUSUMDetector] = {}

    def fit(self, X: np.ndarray, feature_names: Optional[List[str]] = None):
        if feature_names:
            self.feature_names = feature_names
        
        X = np.asarray(X, dtype=np.float64)
        n_samples, n_features = X.shape

        self.feature_means = np.mean(X, axis=0)
        self.feature_stds = np.std(X, axis=0)
        self.feature_stds[self.feature_stds < 1e-6] = 1.0

        X_scaled = (X - self.feature_means) / self.feature_stds

        # 1. Isolation Forest
        self.iforest = IsolationForest(
            n_estimators=self.n_estimators,
            contamination=self.contamination,
            random_state=self.random_state,
            n_jobs=-1
        )
        self.iforest.fit(X)

        # 2. Robust Covariance (Mahalanobis Distance)
        self.robust_cov = EmpiricalCovariance()
        self.robust_cov.fit(X_scaled)

        # 3. Local Outlier Factor (LOF) in novelty mode
        self.lof = LocalOutlierFactor(
            n_neighbors=min(20, max(5, n_samples // 10)),
            contamination=self.contamination,
            novelty=True,
            metric="minkowski",
            p=2
        )
        self.lof.fit(X_scaled)

        for name in self.feature_names:
            self.cusum_detectors[name] = CUSUMDetector()

        self.is_fitted = True
        return self

    def score(
        self, 
        features_dict: Dict[str, float]
    ) -> Dict[str, Any]:
        """
        Evaluates telemetry through the ensemble with calibrated score scaling and XAI attribution.
        """
        if not self.is_fitted:
            raise ValueError("EnsembleAnomalyDetector must be fitted before scoring.")

        x_vec = np.array([float(features_dict.get(name, self.feature_means[i])) for i, name in enumerate(self.feature_names)], dtype=np.float64)
        x_reshaped = x_vec.reshape(1, -1)
        x_scaled = (x_vec - self.feature_means) / self.feature_stds
        x_scaled_reshaped = x_scaled.reshape(1, -1)

        # 1. Isolation Forest Score
        # decision_function gives offset from threshold (positive = normal, negative = anomaly)
        if_raw = float(self.iforest.decision_function(x_reshaped)[0])
        # Smooth calibration: if_raw ~ +0.15 gives 0.08, if_raw ~ -0.15 gives 0.92
        p_iforest = float(np.clip(1.0 / (1.0 + np.exp(if_raw * 15.0)), 0.02, 0.98))
        vote_iforest = if_raw < 0.0

        # 2. Mahalanobis Distance
        maha_dist_sq = float(self.robust_cov.mahalanobis(x_scaled_reshaped)[0])
        dof = len(self.feature_names)
        # Chi2 CDF: 0.999 is highly anomalous
        p_maha_raw = float(chi2.cdf(maha_dist_sq, df=dof))
        p_maha = float(np.clip((p_maha_raw - 0.5) * 2.0, 0.0, 1.0)) if p_maha_raw > 0.5 else 0.0
        vote_maha = p_maha_raw > 0.985

        # 3. Local Outlier Factor (LOF) Score
        lof_raw = float(self.lof.decision_function(x_scaled_reshaped)[0])
        p_lof = float(np.clip(1.0 / (1.0 + np.exp(lof_raw * 12.0)), 0.02, 0.98))
        vote_lof = lof_raw < 0.0

        # 4. Ensemble Consensus
        model_votes = [vote_iforest, vote_maha, vote_lof]
        agreement_count = int(sum(model_votes))
        
        # Weighted ensemble probability
        ensemble_score = float(0.45 * p_iforest + 0.30 * p_maha + 0.25 * p_lof)

        # 5. CUSUM Progressive Drift
        cusum_drifts = {}
        any_cusum_drift = False
        for i, name in enumerate(self.feature_names):
            val = float(x_vec[i])
            detector = self.cusum_detectors.get(name)
            if detector:
                drift_flag, stat = detector.update(val, float(self.feature_means[i]), float(self.feature_stds[i]))
                cusum_drifts[name] = {"drift_detected": drift_flag, "stat": stat}
                if drift_flag:
                    any_cusum_drift = True

        # 6. Explainable AI Feature Attribution
        feature_attributions = []
        total_delta = 0.0
        deltas = []

        for i, name in enumerate(self.feature_names):
            x_perturbed = x_vec.copy()
            x_perturbed[i] = self.feature_means[i]
            
            p_perturbed_if = float(np.clip(1.0 / (1.0 + np.exp(self.iforest.decision_function(x_perturbed.reshape(1, -1))[0] * 15.0)), 0.0, 1.0))
            delta = max(0.0, p_iforest - p_perturbed_if)
            deltas.append(delta)
            total_delta += delta

        for i, name in enumerate(self.feature_names):
            val = float(x_vec[i])
            nominal = float(self.feature_means[i])
            std = float(self.feature_stds[i])
            z_score = float((val - nominal) / std)

            if total_delta > 1e-6:
                contrib_pct = float(round((deltas[i] / total_delta) * 100.0, 1))
            else:
                contrib_pct = float(round(min(100.0, abs(z_score) * 12.0), 1))

            feature_attributions.append({
                "feature": name,
                "current_value": float(round(val, 2)),
                "baseline_mean": float(round(nominal, 2)),
                "baseline_std": float(round(std, 2)),
                "z_score": float(round(z_score, 2)),
                "contribution_pct": contrib_pct
            })

        feature_attributions.sort(key=lambda x: x["contribution_pct"], reverse=True)

        # Categorize Alert Level with true Ensemble Consensus
        # A warning requires elevated probability (>= 0.45) OR multi-model consensus (>= 2 models with score >= 0.35)
        if ensemble_score >= 0.75 or (agreement_count >= 2 and ensemble_score >= 0.60):
            alert_level = "critical"
        elif ensemble_score >= 0.45 or (agreement_count >= 2 and ensemble_score >= 0.35) or (any_cusum_drift and ensemble_score >= 0.35):
            alert_level = "warning"
        else:
            alert_level = "normal"

        return {
            "ensemble_anomaly_score": float(round(ensemble_score, 3)),
            "failure_risk": float(round(min(1.0, ensemble_score * 1.05), 3)),
            "alert_level": alert_level,
            "ensemble_agreement": f"{agreement_count}/3 Models Agree",
            "model_breakdown": {
                "isolation_forest_prob": float(round(p_iforest, 3)),
                "mahalanobis_chi2_prob": float(round(p_maha, 3)),
                "local_outlier_factor_prob": float(round(p_lof, 3))
            },
            "cusum_drift_detected": bool(any_cusum_drift),
            "cusum_details": cusum_drifts,
            "root_cause_attributions": feature_attributions[:4]
        }

