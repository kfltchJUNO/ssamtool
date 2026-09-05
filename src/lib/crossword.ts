// src/lib/crossword.ts
// 한글 가로세로 낱말퍼즐(Crossword) 배치 알고리즘

export interface CrosswordWordInput {
  word: string;
  clue: string;
}

export interface PlacedWord {
  num: number;
  word: string;
  clue: string;
  direction: "across" | "down"; // "across": 가로, "down": 세로
  row: number; // 0-indexed
  col: number; // 0-indexed
}

export interface CrosswordCell {
  char: string;
  num?: number; // 셀 좌상단에 표시될 문제 번호
  acrossNum?: number;
  downNum?: number;
}

export interface CrosswordGridResult {
  rows: number;
  cols: number;
  grid: (CrosswordCell | null)[][];
  placedWords: PlacedWord[];
  acrossClues: { num: number; word: string; clue: string }[];
  downClues: { num: number; word: string; clue: string }[];
  unplacedWords: CrosswordWordInput[];
}

interface InternalPlacement {
  word: string;
  clue: string;
  direction: "across" | "down";
  row: number;
  col: number;
}

/**
 * 주어진 단어 목록으로 가로세로 교차 퍼즐 그리드를 생성합니다.
 * 교차점을 최대화하여 하나의 유기적인 가로세로 낱말판으로 배치합니다.
 */
export function generateCrosswordGrid(
  words: CrosswordWordInput[],
  maxGridSize = 13
): CrosswordGridResult {
  // 특수문자/공백 제거 및 2글자 이상만 필터링
  const validWords = words
    .map(w => ({
      word: w.word.replace(/\s+/g, "").trim(),
      clue: w.clue,
    }))
    .filter(w => w.word.length >= 2 && w.word.length <= maxGridSize);

  // 긴 단어 우선 정렬 (긴 단어가 뼈대가 됨)
  const sortedWords = [...validWords].sort((a, b) => b.word.length - a.word.length);

  if (sortedWords.length === 0) {
    return {
      rows: 0,
      cols: 0,
      grid: [],
      placedWords: [],
      acrossClues: [],
      downClues: [],
      unplacedWords: [],
    };
  }

  const CANVAS_SIZE = maxGridSize * 2 + 5;
  const CENTER = Math.floor(CANVAS_SIZE / 2);

  let bestPlacements: InternalPlacement[] = [];
  let bestScore = -Infinity;

  // 30회 시도 중 최적의 교차 밀도와 크기를 가진 그리드 선택
  const ATTEMPTS = 30;

  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const trialWords = [...sortedWords];
    if (attempt > 0 && trialWords.length > 2) {
      const first = trialWords[0];
      const rest = trialWords.slice(1).sort(() => Math.random() - 0.5);
      trialWords.splice(0, trialWords.length, first, ...rest);
    }

    const canvas: (string | null)[][] = Array.from({ length: CANVAS_SIZE }, () =>
      Array(CANVAS_SIZE).fill(null)
    );
    const placements: InternalPlacement[] = [];

    // 첫 단어: 중앙에 가로로 배치
    const firstWord = trialWords[0];
    const firstCol = CENTER - Math.floor(firstWord.word.length / 2);
    const firstRow = CENTER;
    for (let c = 0; c < firstWord.word.length; c++) {
      canvas[firstRow][firstCol + c] = firstWord.word[c];
    }
    placements.push({
      word: firstWord.word,
      clue: firstWord.clue,
      direction: "across",
      row: firstRow,
      col: firstCol,
    });

    // 나머지 단어 순차적으로 교차 시도
    for (let wIdx = 1; wIdx < trialWords.length; wIdx++) {
      const item = trialWords[wIdx];
      const word = item.word;

      let bestCandidate: { dir: "across" | "down"; row: number; col: number; intersections: number } | null = null;
      let maxIntersections = 0;

      for (let charIdx = 0; charIdx < word.length; charIdx++) {
        const char = word[charIdx];

        for (let r = 1; r < CANVAS_SIZE - 1; r++) {
          for (let c = 1; c < CANVAS_SIZE - 1; c++) {
            if (canvas[r][c] === char) {
              // 1. 세로 배치 후보
              const tryDownRow = r - charIdx;
              const tryDownCol = c;
              if (canPlaceWord(canvas, word, "down", tryDownRow, tryDownCol, CANVAS_SIZE)) {
                const inter = countIntersections(canvas, word, "down", tryDownRow, tryDownCol);
                if (inter > maxIntersections || !bestCandidate) {
                  maxIntersections = inter;
                  bestCandidate = { dir: "down", row: tryDownRow, col: tryDownCol, intersections: inter };
                }
              }

              // 2. 가로 배치 후보
              const tryAcrossRow = r;
              const tryAcrossCol = c - charIdx;
              if (canPlaceWord(canvas, word, "across", tryAcrossRow, tryAcrossCol, CANVAS_SIZE)) {
                const inter = countIntersections(canvas, word, "across", tryAcrossRow, tryAcrossCol);
                if (inter > maxIntersections || !bestCandidate) {
                  maxIntersections = inter;
                  bestCandidate = { dir: "across", row: tryAcrossRow, col: tryAcrossCol, intersections: inter };
                }
              }
            }
          }
        }
      }

      if (bestCandidate) {
        placeWord(canvas, word, bestCandidate.dir, bestCandidate.row, bestCandidate.col);
        placements.push({
          word: item.word,
          clue: item.clue,
          direction: bestCandidate.dir,
          row: bestCandidate.row,
          col: bestCandidate.col,
        });
      }
    }

    // 평가: 배치된 단어 수 * 250 - 바운딩 박스 면적
    const bounds = getBounds(placements);
    if (bounds) {
      const area = (bounds.maxR - bounds.minR + 1) * (bounds.maxC - bounds.minC + 1);
      const score = placements.length * 250 - area;
      if (score > bestScore) {
        bestScore = score;
        bestPlacements = placements;
      }
    }
  }

  if (bestPlacements.length === 0 && sortedWords.length > 0) {
    const first = sortedWords[0];
    bestPlacements = [{
      word: first.word,
      clue: first.clue,
      direction: "across",
      row: CENTER,
      col: CENTER,
    }];
  }

  const bounds = getBounds(bestPlacements)!;
  const rows = bounds.maxR - bounds.minR + 1;
  const cols = bounds.maxC - bounds.minC + 1;

  const normalizedPlacements = bestPlacements.map(p => ({
    ...p,
    row: p.row - bounds.minR,
    col: p.col - bounds.minC,
  }));

  // 번호 부여: (위->아래, 왼->오른쪽)
  const startPointsMap = new Map<string, number>();
  let nextNumber = 1;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const startsHere = normalizedPlacements.some(p => p.row === r && p.col === c);
      if (startsHere) {
        startPointsMap.set(`${r},${c}`, nextNumber++);
      }
    }
  }

  const finalPlacedWords: PlacedWord[] = normalizedPlacements.map(p => ({
    ...p,
    num: startPointsMap.get(`${p.row},${p.col}`) || 1,
  }));

  const finalGrid: (CrosswordCell | null)[][] = Array.from({ length: rows }, () =>
    Array(cols).fill(null)
  );

  for (const p of finalPlacedWords) {
    for (let i = 0; i < p.word.length; i++) {
      const r = p.direction === "across" ? p.row : p.row + i;
      const c = p.direction === "across" ? p.col + i : p.col;
      const char = p.word[i];

      if (!finalGrid[r][c]) {
        finalGrid[r][c] = { char };
      }

      if (i === 0) {
        finalGrid[r][c]!.num = p.num;
        if (p.direction === "across") finalGrid[r][c]!.acrossNum = p.num;
        if (p.direction === "down") finalGrid[r][c]!.downNum = p.num;
      }
    }
  }

  const placedWordSet = new Set(finalPlacedWords.map(p => p.word));
  const unplacedWords = validWords.filter(w => !placedWordSet.has(w.word));

  const acrossClues = finalPlacedWords
    .filter(p => p.direction === "across")
    .map(p => ({ num: p.num, word: p.word, clue: p.clue }))
    .sort((a, b) => a.num - b.num);

  const downClues = finalPlacedWords
    .filter(p => p.direction === "down")
    .map(p => ({ num: p.num, word: p.word, clue: p.clue }))
    .sort((a, b) => a.num - b.num);

  return {
    rows,
    cols,
    grid: finalGrid,
    placedWords: finalPlacedWords,
    acrossClues,
    downClues,
    unplacedWords,
  };
}

function canPlaceWord(
  canvas: (string | null)[][],
  word: string,
  dir: "across" | "down",
  startR: number,
  startC: number,
  size: number
): boolean {
  const len = word.length;
  const endR = dir === "across" ? startR : startR + len - 1;
  const endC = dir === "across" ? startC + len - 1 : startC;

  if (startR < 1 || startC < 1 || endR >= size - 1 || endC >= size - 1) {
    return false;
  }

  // 앞뒤 빈칸 확인
  if (dir === "across") {
    if (canvas[startR][startC - 1] !== null || canvas[startR][endC + 1] !== null) return false;
  } else {
    if (canvas[startR - 1][startC] !== null || canvas[endR + 1][startC] !== null) return false;
  }

  let hasIntersection = false;

  for (let i = 0; i < len; i++) {
    const r = dir === "across" ? startR : startR + i;
    const c = dir === "across" ? startC + i : startC;
    const current = canvas[r][c];
    const needed = word[i];

    if (current !== null) {
      if (current !== needed) return false;
      hasIntersection = true;
    } else {
      if (dir === "across") {
        if (canvas[r - 1][c] !== null || canvas[r + 1][c] !== null) return false;
      } else {
        if (canvas[r][c - 1] !== null || canvas[r][c + 1] !== null) return false;
      }
    }
  }

  return hasIntersection;
}

function countIntersections(
  canvas: (string | null)[][],
  word: string,
  dir: "across" | "down",
  startR: number,
  startC: number
): number {
  let count = 0;
  for (let i = 0; i < word.length; i++) {
    const r = dir === "across" ? startR : startR + i;
    const c = dir === "across" ? startC + i : startC;
    if (canvas[r][c] === word[i]) {
      count++;
    }
  }
  return count;
}

function placeWord(
  canvas: (string | null)[][],
  word: string,
  dir: "across" | "down",
  startR: number,
  startC: number
) {
  for (let i = 0; i < word.length; i++) {
    const r = dir === "across" ? startR : startR + i;
    const c = dir === "across" ? startC + i : startC;
    canvas[r][c] = word[i];
  }
}

function getBounds(placements: InternalPlacement[]): { minR: number; maxR: number; minC: number; maxC: number } | null {
  if (placements.length === 0) return null;
  let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;

  for (const p of placements) {
    minR = Math.min(minR, p.row);
    minC = Math.min(minC, p.col);
    const endR = p.direction === "across" ? p.row : p.row + p.word.length - 1;
    const endC = p.direction === "across" ? p.col + p.word.length - 1 : p.col;
    maxR = Math.max(maxR, endR);
    maxC = Math.max(maxC, endC);
  }

  return { minR, maxR, minC, maxC };
}
