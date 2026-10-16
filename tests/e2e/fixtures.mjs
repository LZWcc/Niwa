// 测试用的 iCal 日历，以“今天”为基准生成，覆盖重复、单次改期、全天、取消、过去的日程。

const pad = (n) => String(n).padStart(2, '0');
const ymd = (date) => `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;

export function sampleIcs(name = '测试日历', today = new Date()) {
  const d = (n) => ymd(new Date(today.getFullYear(), today.getMonth(), today.getDate() + n));
  const nextMonth = ymd(new Date(today.getFullYear(), today.getMonth() + 1, 15));
  const lines = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Niwa test//EN
X-WR-CALNAME:${name}
BEGIN:VTIMEZONE
TZID:Asia/Shanghai
BEGIN:STANDARD
TZOFFSETFROM:+0800
TZOFFSETTO:+0800
TZNAME:CST
DTSTART:19700101T000000
END:STANDARD
END:VTIMEZONE
BEGIN:VEVENT
UID:standup@test
DTSTART;TZID=Asia/Shanghai:20250101T093000
DTEND;TZID=Asia/Shanghai:20250101T094500
RRULE:FREQ=DAILY
SUMMARY:每日站会
END:VEVENT
BEGIN:VEVENT
UID:standup@test
RECURRENCE-ID;TZID=Asia/Shanghai:${d(1)}T093000
DTSTART;TZID=Asia/Shanghai:${d(1)}T110000
DTEND;TZID=Asia/Shanghai:${d(1)}T113000
SUMMARY:站会（改期）
END:VEVENT
BEGIN:VEVENT
UID:late@test
DTSTART;TZID=Asia/Shanghai:${d(0)}T233000
DTEND;TZID=Asia/Shanghai:${d(0)}T235500
SUMMARY:深夜复盘
LOCATION:上海市徐汇区某某路 123 号 会议室 A
DESCRIPTION:<b>议程</b><br>1. 回顾本周<br>2. 下周计划<br><br>资料：https://example.com/doc
X-GOOGLE-CONFERENCE:https://meet.google.com/abc-defg-hij
END:VEVENT
BEGIN:VEVENT
UID:allday@test
DTSTART;VALUE=DATE:${d(0)}
DTEND;VALUE=DATE:${d(1)}
SUMMARY:全天事项
END:VEVENT
BEGIN:VEVENT
UID:cancel@test
DTSTART;TZID=Asia/Shanghai:${d(0)}T230000
DTEND;TZID=Asia/Shanghai:${d(0)}T231500
STATUS:CANCELLED
SUMMARY:已取消会议
END:VEVENT
BEGIN:VEVENT
UID:weekly@test
DTSTART;TZID=Asia/Shanghai:${d(3)}T150000
DTEND;TZID=Asia/Shanghai:${d(3)}T160000
RRULE:FREQ=WEEKLY
SUMMARY:每周例会
END:VEVENT
BEGIN:VEVENT
UID:extra1@test
DTSTART;TZID=Asia/Shanghai:${d(2)}T150000
DTEND;TZID=Asia/Shanghai:${d(2)}T153000
SUMMARY:后天事项1
END:VEVENT
BEGIN:VEVENT
UID:extra2@test
DTSTART;TZID=Asia/Shanghai:${d(2)}T160000
DTEND;TZID=Asia/Shanghai:${d(2)}T163000
SUMMARY:后天事项2
END:VEVENT
BEGIN:VEVENT
UID:extra3@test
DTSTART;TZID=Asia/Shanghai:${d(2)}T170000
DTEND;TZID=Asia/Shanghai:${d(2)}T173000
SUMMARY:后天事项3
END:VEVENT
BEGIN:VEVENT
UID:nextmonth@test
DTSTART;TZID=Asia/Shanghai:${nextMonth}T100000
DTEND;TZID=Asia/Shanghai:${nextMonth}T110000
SUMMARY:下月例会
LOCATION:二楼会议室
END:VEVENT
BEGIN:VEVENT
UID:old@test
DTSTART;TZID=Asia/Shanghai:20200101T100000
DTEND;TZID=Asia/Shanghai:20200101T110000
SUMMARY:旧事件
END:VEVENT
END:VCALENDAR
`;
  return lines.replace(/\n/g, '\r\n');
}

// 获取网站图标用的假网站：一个不存在的 apple-touch-icon（应当跳过），一个用相对地址声明的 SVG 图标。
export const siteHtml = `<!doctype html>
<link rel="apple-touch-icon" href="/site/missing.png">
<link rel="icon" type="image/svg+xml" href="logo.svg">
<title>site</title>`;

export const logoSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" fill="#2a7f62"/></svg>';

// 假的 icon.horse：查到时的图标，和查不到时按首字母生成的占位图。
export const horseSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#4f86c6"/></svg>';
export const letterSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" fill="#999"/><text x="40" y="90" font-size="72" fill="#fff">P</text></svg>';
