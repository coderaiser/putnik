section('@select', select('*', from(join(users, others), where(kind === 'const'))));
