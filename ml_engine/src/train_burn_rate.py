import numpy as np
import joblib
from pathlib import Path
from sklearn.linear_model import LinearRegression

def train():
    np.random.seed(42)
    # Synthetic data (crew_count, temp, storm_intensity) -> liters_per_hour
    crew_count = np.random.uniform(10, 30, 500)
    temp = np.random.uniform(-60, -10, 500)
    storm_intensity = np.random.uniform(0, 10, 500)

    # Simple equation
    # base 100, + 2 per crew, + (30 - temp) * 1.5, + storm_intensity * 5
    y = 100 + (crew_count * 2) + ((30 - temp) * 1.5) + (storm_intensity * 5)
    
    # Adding some noise
    y += np.random.normal(0, 5, 500)

    X = np.column_stack([crew_count, temp, storm_intensity])

    model = LinearRegression()
    model.fit(X, y)

    model_path = Path(__file__).parent.parent / 'models' / 'fuel_burn_model.joblib'
    model_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, model_path)
    print(f"Burn rate model saved to {model_path}")

if __name__ == '__main__':
    train()
