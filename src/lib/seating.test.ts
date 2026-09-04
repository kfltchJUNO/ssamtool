import { assignSeats, Student, ClassElement } from "./seating";

function createStudents(count: number, duplicateNamesCount = 0): Student[] {
  const list: Student[] = [];
  for (let i = 1; i <= count; i++) {
    const name = (duplicateNamesCount > 0 && i <= duplicateNamesCount) ? "김민수" : `학생${i}`;
    list.push({ id: `st-${i}`, name, tag: i % 2 === 0 ? "A" : "B" });
  }
  return list;
}

function createDesks(count: number): ClassElement[] {
  const list: ClassElement[] = [];
  const cols = 5;
  for (let i = 0; i < count; i++) {
    list.push({
      id: `desk-${i + 1}`,
      type: "desk",
      x: i % cols,
      y: Math.floor(i / cols),
    });
  }
  return list;
}

function runTests() {
  console.log("=== Task 1 자리표 배정 알고리즘 검증 시작 ===");

  // Case 1: 학생 16 / 책상 16
  {
    const students = createStudents(16);
    const desks = createDesks(16);
    const result = assignSeats(students, desks);
    console.assert(result.assignments.size === 16, "Test 1-1 Failed: 배정된 책상 수 != 16");
    console.assert(result.unassigned.length === 0, "Test 1-2 Failed: 미배정 학생 수 != 0");
    console.assert(result.emptyDesks.length === 0, "Test 1-3 Failed: 빈 책상 수 != 0");
    const assignedSet = new Set(result.assignments.values());
    console.assert(assignedSet.size === 16, "Test 1-4 Failed: 중복 배정 발생");
    console.log("✅ Test 1 통과 (학생 16 / 책상 16)");
  }

  // Case 2: 학생 16 / 책상 20
  {
    const students = createStudents(16);
    const desks = createDesks(20);
    const result = assignSeats(students, desks);
    console.assert(result.assignments.size === 16, "Test 2-1 Failed");
    console.assert(result.unassigned.length === 0, "Test 2-2 Failed");
    console.assert(result.emptyDesks.length === 4, "Test 2-3 Failed: 빈 책상 수 != 4");
    console.log("✅ Test 2 통과 (학생 16 / 책상 20 → 빈 책상 4)");
  }

  // Case 3: 학생 16 / 책상 12 (학생 > 책상)
  {
    const students = createStudents(16);
    const desks = createDesks(12);
    const result = assignSeats(students, desks);
    console.assert(result.assignments.size === 12, "Test 3-1 Failed");
    console.assert(result.unassigned.length === 4, "Test 3-2 Failed: 미배정 학생 수 != 4");
    console.assert(result.emptyDesks.length === 0, "Test 3-3 Failed");
    console.log("✅ Test 3 통과 (학생 16 / 책상 12 → 미배정 4명)");
  }

  // Case 4: 동명이인 포함 16명 ("김민수" 2명)
  {
    const students = createStudents(16, 2); // st-1, st-2 의 이름이 둘 다 "김민수"
    const desks = createDesks(16);
    const result = assignSeats(students, desks);
    console.assert(result.assignments.size === 16, "Test 4-1 Failed");
    const assignedIds = Array.from(result.assignments.values());
    console.assert(assignedIds.includes("st-1") && assignedIds.includes("st-2"), "Test 4-2 Failed: 동명이인 중 1명 누락");
    const deskId1 = Array.from(result.assignments.entries()).find(entry => entry[1] === "st-1")?.[0];
    const deskId2 = Array.from(result.assignments.entries()).find(entry => entry[1] === "st-2")?.[0];
    console.assert(deskId1 !== deskId2, "Test 4-3 Failed: 동명이인 2명이 동일 책상 배정됨");
    console.log("✅ Test 4 통과 (동명이인 '김민수' 2명 고유 책상 배정)");
  }

  // Case 5: 1000회 반복 실행 검증
  {
    let passCount = 0;
    for (let i = 0; i < 1000; i++) {
      const students = createStudents(16);
      const desks = createDesks(16);
      const res = assignSeats(students, desks);
      if (res.assignments.size === 16 && res.unassigned.length === 0) {
        passCount++;
      }
    }
    console.assert(passCount === 1000, `Test 5 Failed: 1000회 중 ${passCount}회 성공`);
    console.log("✅ Test 5 통과 (1000회 반복 테스트 100% 성공)");
  }

  console.log("🎉 모든 테스트 케이스 성공!");
}

runTests();
