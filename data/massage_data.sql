-- download csv files from https://fred.stlouisfed.org/series/DGS5
-- using DuckDB to combine the csv files

-- 15yr and 30yr mortgages
COPY (
WITH MORTGAGE15US AS (
   SELECT * FROM 'data/MORTGAGE15US.csv'
),
MORTGAGE30US AS (
   SELECT * FROM 'data/MORTGAGE30US.csv'
)
SELECT
  *
FROM MORTGAGE15US AS '15us'
LEFT JOIN MORTGAGE30US AS '30us' USING(date)
) TO 'data/mortgage.csv' (FORMAT 'CSV');


-- 2yr, 5yr and 10yr treasuries
COPY (
WITH DGS2 AS (
   SELECT * FROM 'data/DGS2.csv'
),
DGS5 AS (
   SELECT * FROM 'data/DGS5.csv'
),
DGS10 AS (
   SELECT * FROM 'data/DGS10.csv'
)
SELECT
  *
FROM DGS2 AS 'DGS2'
LEFT JOIN DGS5 AS 'DGS5' USING(date)
LEFT JOIN DGS10 AS 'DGS10' USING(date)
) TO 'data/treasuries.csv' (FORMAT 'CSV');