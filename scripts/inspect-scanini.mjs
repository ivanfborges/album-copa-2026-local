const url = process.argv[2]
const needle = process.argv[3] ?? '/teams/'
const html = await fetch(url).then((response) => response.text())
const index = html.indexOf(needle)

console.log(index)
console.log(html.slice(Math.max(0, index - 500), index + 1200))
