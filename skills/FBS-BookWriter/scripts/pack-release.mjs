#!/usr/bin/env node
import { runWorkBuddyPack } from './pack-workbuddy-marketplace.mjs';
import { runCodeBuddyPack } from './pack-codebuddy-plugin.mjs';

console.log('开始构建双通道发布包...');
runWorkBuddyPack();
runCodeBuddyPack();
console.log('双通道发布包已全部完成。');
