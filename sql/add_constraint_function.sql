-- Function to execute SQL for adding constraints
CREATE OR REPLACE FUNCTION add_constraint(constraint_sql TEXT) RETURNS VOID AS $$
BEGIN
  EXECUTE constraint_sql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 