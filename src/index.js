const Simplex = require('./simplex/simplex')

const main = () => {
  console.clear()
  // test1()
  // test2()
  // test3()
  // test4()
  // test5()
  // test6()

  // let simplex = new Simplex()
  // simplex.setFn(['max', 1, 1])
  // simplex.setRestrictions([
  //   [-1, 1, '>=', 3],
  //   [1, 1, '<=', 27],
  //   [2, -1, '<=', -3]
  // ])
  // simplex.solve()

  let simplex = new Simplex()
  simplex.setFn(['min', 1, -1, 2, 0])
  simplex.setRestrictions([
      [1, 1, 1, 0, '=', 3],
      [2, -1, 3, 1, '=', 4]
  ])
  simplex.solve()

  // let simplex = new Simplex()
  // simplex.setFn(['min', -1, -1])
  // simplex.setRestrictions([
  //     [1, -1, '<=', 4],
  //     [-1, 1, '<=', 4]
  // ])
  // simplex.solve()
}

function test1() {
  let simplex = new Simplex()
  simplex.setFn(['max', 1, 2, -1])
  simplex.setRestrictions([
    [2, 1, 1, '<=', 14],
    [4, 2, 3, '<=', 28],
    [2, 5, 5, '<=', 30]
  ])
  simplex.solve()
}

function test2() {
  let simplex = new Simplex()
  simplex.setFn(['min', -1, -1])
  simplex.setRestrictions([
    [1, -1, '<=', 4],
    [-1, 1, '<=', 4]
  ])
  simplex.solve()
}

function test3() {
  let simplex = new Simplex()
  simplex.setFn(['max', 3, 2])
  simplex.setRestrictions([
    [2, 1, '<=', 18],
    [2, 3, '<=', 42],
    [3, 1, '<=', 24]
  ])
  simplex.solve()
}

function test4() {
  let simplex = new Simplex()
  simplex.setFn(['min', 1, -1, 2])
  simplex.setRestrictions([
    [1, 1, 1, '=', 3],
    [2, -1, 3, '<=', 4]
  ])
  simplex.solve()
}

function test5() {
  let simplex = new Simplex()
  simplex.setFn(['max', 1, 2])
  simplex.setRestrictions([
    [-2, 1, 1, '>=', 3],
    [3, 4, 0, '<=', 5]
  ])
  simplex.solve()
}

function test6() {
  let simplex = new Simplex()
  simplex.setFn(['max', 3, 1])
  simplex.setRestrictions([
    [2, 1, '<=', 30],
    [1, 4, '<=', 40]
  ])
  simplex.solve()
}

main()
