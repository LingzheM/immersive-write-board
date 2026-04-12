/**
 * 
 * @param n 执行次数
 * @param f 回调函数
 */
export default function times(n: number, f: (i: number) => void): void {
    for (let i = 0; i < n; i++) {
        f(i);
    }
}