
import pandas as pd

df = pd.read_csv('tox21.csv')
print("Shape:", df.shape)
print("\nFirst 3 rows:")
print(df.head(3))
print("\nMissing values per column:")
print(df.isnull().sum())
print("\nColumn names:")
print(df.columns.tolist())