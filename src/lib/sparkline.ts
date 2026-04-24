export function getSparkline(data: number[]): string {
  if (!data || data.length === 0) return '';
  const min = Math.min(...data);
  const max = Math.max(...data);
  const blocks = [' ', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
  
  if (min === max) {
    return data.map(() => '▄').join('');
  }
  
  return data.map(val => {
    const i = Math.round(((val - min) / (max - min)) * (blocks.length - 1));
    return blocks[i];
  }).join('');
}
