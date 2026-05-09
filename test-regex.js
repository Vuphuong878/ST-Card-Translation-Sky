const regex = /(?:["']([^"']+)["']|([^\s:.,;]+))\s*:\s*z\.\w+/g;
let match = regex.exec('时间: z.object(');
console.log(match);
