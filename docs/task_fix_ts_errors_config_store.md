# 任务：修复 config-store.ts 中的 TypeScript 类型错误

## 任务背景
在 `electron/config-store.ts` 文件中，存在几处参数隐式具有 `any` 类型的错误（TS7006）。这些错误通常是因为从 `configStore.get()` 获取的值被推断为 `any` 类型，导致后续的数组操作（如 `filter`, `find`）中的回调函数参数也变成了 `any`。

## 报错详情
1. 227 行：参数 “q” 隐式具有 “any” 类型。
2. 235 行：参数 “d” 隐式具有 “any” 类型。
3. 249 行：参数 “d” 隐式具有 “any” 类型。
4. 260 行：参数 “d” 隐式具有 “any” 类型。

## 修复方案
- 为从 `configStore.get()` 获取的变量添加明确的类型断言（Type Assertion）。
- 或者在箭头函数参数中添加类型说明。

## 预期结果
- 消除 `electron/config-store.ts` 中的所有 TS7006 错误。
- 确保代码类型安全。
