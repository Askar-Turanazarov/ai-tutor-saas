/** Demo players for the weekly league: 12 per division, pace (XP/day) rising with the division. */
const NAMES = [
  "Aziz R.", "Shahnoza T.", "Jasur M.", "Kamola Y.", "Bekzod A.", "Nilufar S.", "Sardor K.", "Madina X.", "Otabek N.", "Zarina I.",
  "Rustam B.", "Gulnora Q.", "Javohir E.", "Feruza U.", "Eldor Sh.", "Dildora O.", "Ulugʻbek H.", "Sevara Z.", "Akmal D.", "Nodira V.",
  "Алексей П.", "Екатерина С.", "Дмитрий Л.", "Анна К.", "Сергей М.", "Ольга Н.", "Ильдар Г.", "Лейла А.", "Артём В.", "Мария Ж.",
  "Doniyor F.", "Malika R.", "Shoxrux T.", "Laylo M.", "Sherzod Y.", "Mohira A.", "Behruz S.", "Gulbahor K.", "Islom X.", "Diyora N.",
  "Анвар Р.", "Камила Б.", "Тимур Х.", "Диана Е.", "Руслан У.", "Алина Ш.", "Бахтиёр О.", "Юлия Ч.", "Фаррух Д.", "Нигора Т.",
  "Sanjar L.", "Munisa P.", "Ozod G.", "Hilola I.", "Firdavs J.", "Robiya Q.", "Asadbek U.", "Charos Z.", "Muhammad E.", "Ezoza H.",
];
const PACE = [[25, 70], [50, 110], [90, 170], [140, 240], [200, 340]];

export const DEMO_PLAYERS = NAMES.map((name, i) => {
  const league = Math.floor(i / 12);
  const [lo, hi] = PACE[league];
  return { id: `demo-${String(i + 1).padStart(2, "0")}`, name, league, pace: lo + Math.round(((i * 37) % 12) * ((hi - lo) / 11)) };
});
