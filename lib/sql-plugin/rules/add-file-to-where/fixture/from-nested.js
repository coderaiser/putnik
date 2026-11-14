section('@select', select(id, from(users, where(file === ':file' && inQuery(id, select(parent_id, from(others)))))));
