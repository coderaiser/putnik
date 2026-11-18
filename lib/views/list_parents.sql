CREATE VIEW list_parents AS
SELECT 'Program' AS parent_type
UNION ALL SELECT 'BlockStatement'
UNION ALL SELECT 'StaticBlock'
UNION ALL SELECT 'TSModuleBlock'
UNION ALL SELECT 'SwitchCase'
