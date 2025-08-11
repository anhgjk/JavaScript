/**
 * 核心函数：在5x5网格中动态生成四个不重合且形状独特的图形
 * @returns {Object} 包含 shapes (0-indexed 坐标) 和 gridSize 的对象
 *                   或 null 如果无法在指定尝试次数内找到解
 */
function generateUniqueConnectedShapesOnGrid() {
    const GRID_SIZE = 5;
    const NUM_SHAPES_TO_GENERATE = 4;
    const MIN_SHAPE_SIZE = 1; // 最小方块数
    const MAX_SHAPE_SIZE = 19; // 最大方块数

    const MAX_TOTAL_ATTEMPTS = 200; // 整个过程的最大尝试次数（防止死循环）
    const MAX_GENERATE_ATTEMPTS_PER_SHAPE = 50; // 单个形状的生成尝试次数

    // Grid 类用于管理网格状态
    class Grid {
        constructor(size) {
            this.size = size;
            this.grid = Array(size).fill(0).map(() => Array(size).fill(0)); // 0:空, 1:占用
        }

        isOccupied(r, c) {
            return this.grid[r][c] === 1;
        }

        markOccupied(r, c) {
            this.grid[r][c] = 1;
        }

        markFree(r, c) {
            this.grid[r][c] = 0;
        }

        isValid(r, c) {
            return r >= 0 && r < this.size && c >= 0 && c < this.size;
        }

        // 获取所有未被占用的单元格
        getAvailableCells() {
            const available = [];
            for (let r = 0; r < this.size; r++) {
                for (let c = 0; c < this.size; c++) {
                    if (this.grid[r][c] === 0) {
                        available.push([r, c]);
                    }
                }
            }
            return available;
        }

        // 打印网格（用于调试）
        printGrid() {
            for (let r = 0; r < this.size; r++) {
                console.log(this.grid[r].join(' '));
            }
        }
    }

    /**
     * 规范化图形：获取图形的“指纹”字符串，用于比较形状是否相同
     * @param {Array<Array<number>>} shapePoints - 图形的坐标点数组 (0-indexed)
     * @returns {string} 形状的唯一指纹
     */
    function normalizeShape(shapePoints) {
        // 旋转90度 (r, c) -> (c, -r)
        function rotate(points) {
            let rotated = points.map(([r, c]) => [c, -r]);
            return normalizeToOrigin(rotated);
        }

        // 水平翻转 (r, c) -> (r, max_c - c)
        function flipH(points) {
            let maxC = Math.max(...points.map(p => p[1]));
            let flipped = points.map(([r, c]) => [r, maxC - c]);
            return normalizeToOrigin(flipped);
        }

        // 垂直翻转 (r, c) -> (max_r - r, c)
        function flipV(points) {
            let maxR = Math.max(...points.map(p => p[0]));
            let flipped = points.map(([r, c]) => [maxR - r, c]);
            return normalizeToOrigin(flipped);
        }

        // 平移到原点 (0,0) 并排序
        function normalizeToOrigin(points) {
            if (points.length === 0) return [];
            let minR = Infinity, minC = Infinity;
            points.forEach(([r, c]) => {
                minR = Math.min(minR, r);
                minC = Math.min(minC, c);
            });
            return points.map(([r, c]) => [r - minR, c - minC]).sort((a, b) => {
                if (a[0] !== b[0]) return a[0] - b[0];
                return a[1] - b[1];
            });
        }

        const rotations = [];
        let currentShape = normalizeToOrigin(shapePoints);

        // 生成所有8种对称形态 (4个旋转 x 2个翻转)
        for (let i = 0; i < 4; i++) { // 0, 90, 180, 270度
            rotations.push(currentShape);
            rotations.push(flipH(currentShape)); // 水平翻转
            rotations.push(flipV(currentShape)); // 垂直翻转
            currentShape = rotate(currentShape);
        }

        // 将所有形态转换为字符串，取字典序最小的作为指纹
        let minFingerprint = "";
        for (const shape of rotations) {
            const fingerprint = JSON.stringify(shape);
            if (minFingerprint === "" || fingerprint < minFingerprint) {
                minFingerprint = fingerprint;
            }
        }
        return minFingerprint;
    }

    // 辅助函数：将 [row, col] 坐标转换为 1-indexed 线性编号
    function convertToLinearIndex(r, c, gridSize) {
        return r * gridSize + c + 1;
    }

    let globalAttempts = 0;

    // 主循环，尝试生成整个组合
    while (globalAttempts < MAX_TOTAL_ATTEMPTS) {
        const grid = new Grid(GRID_SIZE);
        const placedShapesCoords = []; // 存储已放置图形的坐标 (0-indexed)
        const placedShapesFingerprints = new Set(); // 存储已放置图形的指纹
        let success = true;

        for (let i = 0; i < NUM_SHAPES_TO_GENERATE; i++) {
            let currentShapeGenerated = false;
            let generateAttempts = 0;

            while (generateAttempts < MAX_GENERATE_ATTEMPTS_PER_SHAPE) {
                generateAttempts++;

                // 随机选择一个未被占用的起始点
                const availableCells = grid.getAvailableCells();
                if (availableCells.length === 0) {
                    // 没有更多空间了，本次尝试失败
                    success = false;
                    break;
                }
                const startCell = availableCells[Math.floor(Math.random() * availableCells.length)];
                const [startR, startC] = startCell;

                // 临时网格用于生成过程，避免污染主网格
                // 复制当前grid状态到tempGrid，确保新生成的形状不会重叠已有的形状
                const tempGrid = new Grid(GRID_SIZE);
                for(let r=0; r<GRID_SIZE; r++) {
                    for(let c=0; c<GRID_SIZE; c++) {
                        tempGrid.grid[r][c] = grid.grid[r][c];
                    }
                }

                let currentShapePoints = [[startR, startC]];
                tempGrid.markOccupied(startR, startC); // 标记为已占用

                const shapeSize = Math.floor(Math.random() * (MAX_SHAPE_SIZE - MIN_SHAPE_SIZE + 1)) + MIN_SHAPE_SIZE;

                // 用于生长过程的邻居管理
                const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]]; // 上下左右

                // 存储当前形状所有方块的未被占用的邻居，从中随机选择下一个方块
                let expandableNeighbors = [];
                let visitedNeighbors = new Set(); // 避免重复添加邻居

                // 初始化 expandableNeighbors
                for (const [dr, dc] of directions) {
                    const nr = startR + dr;
                    const nc = startC + dc;
                    if (tempGrid.isValid(nr, nc) && !tempGrid.isOccupied(nr, nc) && !visitedNeighbors.has(`${nr},${nc}`)) {
                        expandableNeighbors.push([nr, nc]);
                        visitedNeighbors.add(`${nr},${nc}`);
                    }
                }

                let growthPossible = true;
                for (let k = 1; k < shapeSize; k++) { // 已经有一个点，还需要 k-1 个点
                    if (expandableNeighbors.length === 0) {
                        growthPossible = false; // 无法继续生长出足够大的形状
                        break;
                    }
                    // 随机选择下一个点
                    const nextIdx = Math.floor(Math.random() * expandableNeighbors.length);
                    const [nextR, nextC] = expandableNeighbors.splice(nextIdx, 1)[0]; // 移除并获取

                    currentShapePoints.push([nextR, nextC]);
                    tempGrid.markOccupied(nextR, nextC);

                    // 将新点的邻居（未被占用且未添加到 expandableNeighbors 的）加入
                    for (const [dr, dc] of directions) {
                        const nr = nextR + dr;
                        const nc = nextC + dc;
                        if (tempGrid.isValid(nr, nc) && !tempGrid.isOccupied(nr, nc) && !visitedNeighbors.has(`${nr},${nc}`)) {
                            expandableNeighbors.push([nr, nc]);
                            visitedNeighbors.add(`${nr},${nc}`);
                        }
                    }
                }
                
                // 确保形状达到了所需大小且成功生长
                if (!growthPossible || currentShapePoints.length !== shapeSize) {
                    continue; // 生成失败，重新尝试
                }

                // 检查形状唯一性
                const fingerprint = normalizeShape(currentShapePoints);
                if (!placedShapesFingerprints.has(fingerprint)) {
                    // 形状唯一，可以接受
                    placedShapesCoords.push(currentShapePoints);
                    placedShapesFingerprints.add(fingerprint);

                    // 将临时网格的更新应用到主网格
                    for (const [r, c] of currentShapePoints) {
                        grid.markOccupied(r, c);
                    }
                    currentShapeGenerated = true; // 标记为当前图形生成成功
                    break; // 当前图形生成成功，进入下一个图形
                }
            }

            if (!currentShapeGenerated) {
                // 当前图形未能生成成功，整个组合尝试失败，重新开始
                success = false;
                break;
            }
        }

        if (success) {
            console.log(`成功在第 ${globalAttempts + 1} 次总尝试中找到解！`);
            console.log("最终网格状态 (0:空, 1:占用):");
            grid.printGrid();
            return {
                shapes: placedShapesCoords,
                gridSize: GRID_SIZE
            }; // 返回图形坐标和网格大小
        }
        globalAttempts++;
    }

    console.log(`在 ${MAX_TOTAL_ATTEMPTS} 次总尝试后未能找到解。`);
    return null; // 无法在指定尝试次数内找到解
}

/**
 * 辅助函数：根据图形坐标数组可视化网格
 * @param {Array<Array<Array<number>>>} shapes - 包含所有图形坐标的数组 (0-indexed)
 * @param {number} size - 网格大小
 */
function visualizeGrid(shapes, size) {
    const displayGrid = Array(size).fill(0).map(() => Array(size).fill('-')); // '-' 表示空

    shapes.forEach((shape, shapeIndex) => {
        // 给每个图形一个不同的标记，例如 'A', 'B', 'C', 'D'
        const marker = String.fromCharCode(65 + shapeIndex); // 65是'A'的ASCII码
        shape.forEach(([r, c]) => {
            // 确保坐标在网格范围内
            if (r >= 0 && r < size && c >= 0 && c < size) {
                displayGrid[r][c] = marker;
            }
        });
    });

    for (let r = 0; r < size; r++) {
        console.log(displayGrid[r].join(' '));
    }
}

// 调用主函数并处理结果
const resultObj = generateUniqueConnectedShapesOnGrid();

if (resultObj) {
    const { shapes, gridSize } = resultObj;

    console.log("\n四个图形的坐标点 (1-indexed 线性编号):");
    const convertToLinearIndexOutside = (r, c, size) => r * size + c + 1; // 辅助函数在外部定义

    shapes.forEach((shape, index) => {
        const linearCoords = shape.map(([r, c]) => convertToLinearIndexOutside(r, c, gridSize));
        console.log(`图形 ${index + 1} (${shape.length}个方块): ${linearCoords.join(', ')}`);
    });

    console.log("\n网格可视化 (每个图形用一个字母标记):");
    visualizeGrid(shapes, gridSize);
}

