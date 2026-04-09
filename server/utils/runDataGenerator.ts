/**
 * 跑步工具函数
 * 生成跑步数据、距离计算等
 */
import crypto from 'crypto';

export interface RunPoint {
    task_id: string;
    point_id: string;
    point_name: string;
    longitude: string;
    latitude: string;
    point_list: Array<{ longitude: string; latitude: string }>;
}

export interface RunTask {
    code: string;
    message: string;
    start_date: string;
    start_time: string;
    end_date: string;
    end_time: string;
    mileage: string;
    min_time: string;
    max_time: string;
    min_speed: string;
    max_speed: string;
    run_point_list: RunPoint[];
}

// GPS 偏移标准差
const _STD = 1 / 50000;
// 路径点插值步长
const _STEP_LENGTH = 0.0001;

function normalRandom(mean: number, std: number): number {
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z * std;
}

function haversineDistance(point1: [number, number], point2: [number, number]): number {
    const R = 6371000;
    const phi1 = (point1[1] * Math.PI) / 180;
    const phi2 = (point2[1] * Math.PI) / 180;
    const deltaPhi = ((point2[1] - point1[1]) * Math.PI) / 180;
    const deltaLambda = ((point2[0] - point1[0]) * Math.PI) / 180;

    const a = Math.sin(deltaPhi / 2) ** 2 +
        Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

function formatRouteToAmap(pointList: Array<{ longitude: string; latitude: string }>): [number, number][] {
    return pointList.map(p => [parseFloat(p.longitude), parseFloat(p.latitude)]);
}

function addDeviation(point: [number, number]): [number, number] {
    return [normalRandom(point[0], _STD), normalRandom(point[1], _STD)];
}

function addPoints(pointA: [number, number], pointB: [number, number]): [number, number][] {
    const dx = pointB[0] - pointA[0];
    const dy = pointB[1] - pointA[1];
    const distance = Math.sqrt(dx * dx + dy * dy);
    const numPoints = Math.floor(distance / _STEP_LENGTH);

    const points: [number, number][] = [pointA];
    const unitX = dx / distance;
    const unitY = dy / distance;

    for (let i = 1; i < numPoints; i++) {
        points.push([
            pointA[0] + i * _STEP_LENGTH * unitX,
            pointA[1] + i * _STEP_LENGTH * unitY
        ]);
    }

    return points;
}

function combinePoints(pointList: Array<{ longitude: string; latitude: string }>): [number, number][] {
    if (!pointList || !pointList[0]?.latitude) {
        throw new Error("任务为空");
    }

    const route = formatRouteToAmap(pointList);
    const combined: [number, number][] = [];

    for (let index = 0; index < route.length; index++) {
        if (index === route.length - 1) {
            combined.push(route[index]);
            break;
        }

        const pts = addPoints(route[index], route[index + 1]);
        combined.push(...pts);
    }

    return combined;
}

function trimRoute(route: [number, number][], distanceKm: number): { points: [number, number][]; distance: number } {
    let r = 0;
    const oriI = Math.floor(Math.random() * route.length);
    let i = oriI;
    const points: [number, number][] = [addDeviation(route[oriI])];
    const distanceM = distanceKm * 1000;

    while (r < distanceM) {
        const point = addDeviation(route[i]);
        points.push(point);
        r = 0;
        for (let j = 0; j < points.length - 1; j++) {
            r += haversineDistance(points[j], points[j + 1]);
        }
        i++;
        if (i >= route.length - 2) i = 0;
    }

    return { points, distance: r };
}

function generateRoute(distance: string, taskToday: { pointList: Array<{ longitude: string; latitude: string }> }): { mockRoute: Array<{ longitude: string; latitude: string }>; distance: string } {
    const pointList = taskToday.pointList;
    if (!pointList) {
        throw new Error("任务中没有打卡点信息");
    }

    const routeAddedPoints = combinePoints(pointList);
    const distanceKm = parseFloat(distance);
    const { points, distance: actualDistanceM } = trimRoute(routeAddedPoints, distanceKm);

    const mockRoute = points.map(([lon, lat]) => ({
        longitude: lon.toFixed(6),
        latitude: lat.toFixed(6)
    }));

    return {
        mockRoute,
        distance: (actualDistanceM / 1000).toFixed(2)
    };
}

function calculateAvgSpeed(usedTimeSeconds: number, km: number): string {
    if (usedTimeSeconds <= 0) return "0";
    const speedKmh = km / (usedTimeSeconds / 3600);
    return speedKmh.toFixed(2);
}

function formatUsedTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function generateSimpleTrack(startPoint: { longitude: string; latitude: string }, km: number, pointCount: number = 50): Array<{ longitude: string; latitude: string }> {
    const points = [];
    const startLng = parseFloat(startPoint.longitude || "119.48");
    const startLat = parseFloat(startPoint.latitude || "31.37");
    const radius = km / (2 * Math.PI) * 0.009;

    for (let i = 0; i < pointCount; i++) {
        const angle = (2 * Math.PI * i) / pointCount;
        const randomOffsetLng = (Math.random() - 0.5) * 0.0002;
        const randomOffsetLat = (Math.random() - 0.5) * 0.0002;

        const lng = startLng + radius * Math.cos(angle) + randomOffsetLng;
        const lat = startLat + radius * Math.sin(angle) + randomOffsetLat;

        points.push({
            longitude: lng.toFixed(6),
            latitude: lat.toFixed(6)
        });
    }

    points.push({
        longitude: (startLng + (Math.random() - 0.5) * 0.0002).toFixed(6),
        latitude: (startLat + (Math.random() - 0.5) * 0.0002).toFixed(6)
    });

    return points;
}

function selectPointForCampus(runPointList: RunPoint[], campusName: string): RunPoint | null {
    if (!runPointList) return null;

    const campusLower = campusName?.toLowerCase() || "";

    for (const point of runPointList) {
        const pointNameLower = point.point_name.toLowerCase();
        if (campusLower && campusLower.includes(pointNameLower)) {
            return point;
        }
        if (campusName?.includes("天目湖") && point.point_name.includes("天目湖")) {
            return point;
        }
    }

    return null;
}

function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateRunData(options: {
    task: RunTask;
    stuNumber: string;
    token: string;
    campusName: string;
    km?: number;
    usedTimeMinutes?: number;
    pointIndex?: number;
    runDate?: string;
    runTime?: string;
}): Record<string, unknown> & { _pointList: Array<{ longitude: string; latitude: string }>; _selectedPoint: string } {
    const { task, stuNumber, token, campusName, km, usedTimeMinutes, pointIndex, runDate, runTime } = options;

    // 1. 设置里程
    let finalKm = km;
    if (finalKm === undefined) {
        const requiredKm = parseFloat(task.mileage) || 3.2;
        finalKm = requiredKm + Math.random() * 0.25 + 0.05;
    }

    // 2. 设置用时
    let finalUsedMinutes = usedTimeMinutes;
    if (finalUsedMinutes === undefined) {
        const minTime = parseInt(task.min_time) || 10;
        const maxTime = parseInt(task.max_time) || 25;
        finalUsedMinutes = randomInt(minTime + 2, maxTime - 2);
    }
    const usedTimeSeconds = finalUsedMinutes * 60;

    // 3. 选择打卡点
    let selectedPoint: RunPoint | null = null;
    let startPoint = { longitude: "119.4801785", latitude: "31.372601" };
    let taskId = "sunrunTaskPaper-20210917000004";
    let routeId = "sunrunLine-20210918000001";

    if (task.run_point_list && task.run_point_list.length > 0) {
        if (pointIndex !== undefined && pointIndex >= 0 && pointIndex < task.run_point_list.length) {
            selectedPoint = task.run_point_list[pointIndex];
        } else {
            selectedPoint = selectPointForCampus(task.run_point_list, campusName) || task.run_point_list[0];
        }

        if (selectedPoint) {
            startPoint = {
                longitude: selectedPoint.longitude,
                latitude: selectedPoint.latitude
            };
            taskId = selectedPoint.task_id;
            routeId = selectedPoint.point_id;
        }
    }

    // 4. 生成时间
    let submitDate: string;
    let startTimeStr: string;
    let endTimeStr: string;

    const now = new Date();
    const today = now.toISOString().split('T')[0];

    if (runDate) {
        submitDate = runDate;
        if (runTime) {
            startTimeStr = runTime;
            const [h, m, s] = runTime.split(':').map(Number);
            const endSeconds = h * 3600 + m * 60 + s + usedTimeSeconds;
            endTimeStr = `${Math.floor(endSeconds / 3600).toString().padStart(2, '0')}:${Math.floor((endSeconds % 3600) / 60).toString().padStart(2, '0')}:${(endSeconds % 60).toString().padStart(2, '0')}`;
        } else {
            const startH = task.start_time ? parseInt(task.start_time.split(':')[0]) : 6;
            const endH = task.end_time ? parseInt(task.end_time.split(':')[0]) : 22;
            const randH = randomInt(startH, Math.max(startH, endH - 1));
            const randM = randomInt(0, 59);
            const randS = randomInt(0, 59);
            startTimeStr = `${randH.toString().padStart(2, '0')}:${randM.toString().padStart(2, '0')}:${randS.toString().padStart(2, '0')}`;
            endTimeStr = `${Math.floor((randH * 3600 + randM * 60 + randS + usedTimeSeconds) / 3600).toString().padStart(2, '0')}:${Math.floor(((randH * 3600 + randM * 60 + randS + usedTimeSeconds) % 3600) / 60).toString().padStart(2, '0')}:${((randH * 3600 + randM * 60 + randS + usedTimeSeconds) % 60).toString().padStart(2, '0')}`;
        }
    } else {
        submitDate = today;
        endTimeStr = now.toTimeString().slice(0, 8);
        const start = new Date(now.getTime() - usedTimeSeconds * 1000);
        startTimeStr = start.toTimeString().slice(0, 8);
    }

    // 5. 生成轨迹点
    let pointList: Array<{ longitude: string; latitude: string }> = [];
    try {
        if (selectedPoint?.point_list && selectedPoint.point_list.length > 0) {
            const routeResult = generateRoute(finalKm.toFixed(2), { pointList: selectedPoint.point_list });
            pointList = routeResult.mockRoute;
        } else {
            pointList = generateSimpleTrack(startPoint, finalKm);
        }
    } catch {
        pointList = generateSimpleTrack(startPoint, finalKm);
    }

    // 6. 计算步数
    const steps = Math.floor(finalKm * 1500 + randomInt(-100, 100));

    return {
        LocalSubmitReason: "",
        avgSpeed: calculateAvgSpeed(usedTimeSeconds, finalKm),
        baseStation: "",
        endTime: endTimeStr,
        submitDate,
        evaluateDate: submitDate,
        fitDegree: "1",
        flag: "1",
        headImage: "",
        ifLocalSubmit: "1",
        km: finalKm.toFixed(2),
        mac: "02:00:00:00:00:00",
        phoneInfo: "$CN11/iPhone15,4/17.4.1",
        phoneNumber: "",
        pointList: "",
        routeId,
        runType: "0",
        sensorString: "",
        startTime: startTimeStr,
        steps: steps.toString(),
        stuNumber,
        taskId,
        token,
        usedTime: formatUsedTime(usedTimeSeconds),
        version: "1.2.14",
        warnFlag: "0",
        warnType: "",
        faceData: "",
        _pointList: pointList,
        _selectedPoint: selectedPoint?.point_name || "默认"
    };
}
