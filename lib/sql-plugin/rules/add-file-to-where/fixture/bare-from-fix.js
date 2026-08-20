section('@select', select('*', from(join(users, others), where(file === ':file' && kind === 'const'))));
