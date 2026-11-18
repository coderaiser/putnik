section('@select', select(block.id, from(BlockStatement as 'block', where(notExists(select(1, from(nodes as 'child', where(child.parent_id === block.id && child.file === block.file))))))));
