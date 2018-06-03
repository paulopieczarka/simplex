const gauss = require('./gaussian-elimination')
const _ = require('underscore')

const Restriction = (fn) => ({
  type: fn.splice(-2, 1)[0],
  value: fn.splice(-1, 1)[0],
  vars: fn
})

class Simplex {
  constructor () {
    this.costs = []
    this.restrictions = []
  }

  // Solver.

  fase1 () {
    console.log('[============= FASE 1 =============]')
    this.mat = createMatrix(this.restrictions)
    this.b = this.restrictions.map(x => x.value)

    const oldRestrictions = this.restrictions.slice()
    const oldMat = this.mat.map(row => row.slice())
    const oldCosts = this.costs.slice()
    const oldFnSize = this.fnSize * 1

    this.addIdentidade()
    this.print()    
    this.setInitialBandN()

    const j = this.costs.length - this.restrictions.length
    this.artificialCosts = this.costs.map((x, i) => i<j ? 0 : 1)

    console.log(this.artificialCosts)

    const solver = new SimplexSteps(this.mat, this.b, this.artificialCosts, this.B, this.N)
    const { B, N } = solver.exec()

    this.B = B
    this.N = N.filter(x => x<j)
    this.mat = oldMat
    this.restrictions = oldRestrictions
    this.fnSize = oldFnSize
    this.costs = oldCosts
  }

  fase2 () {
    console.log('[============= FASE 2 =============]')

    if (!this.mat) {
      this.mat = createMatrix(this.restrictions)
      this.b = this.restrictions.map(x => x.value)
      this.setInitialBandN()
    }

    this.print()
    console.log(' N =', this.N, ' B =', this.B)
    console.log(' custos f =', this.costs)

    const solver = new SimplexSteps(this.mat, this.b, this.costs, this.B, this.N)
    const response = solver.exec()
    console.log(response)
  }

  solve () {
    this.toStandardFn()

    if (this.needFase1) {
      console.log('[?] Precisa Fase 1? Sim.')
      this.fase1()
    }
    else {
      console.log('[?] Precisa Fase 2? Não.')
    }

    this.fase2()
  }

  // Start

  setFn (fn) {
    this.fnType = fn.splice(0, 1)[0]
    fn.forEach(x => this.costs.push(x))
    this.fnSize = this.costs.length
  }

  addRestriction(fn) {
    // Quando b for negativo, inverte função.
    if (fn.value < 0) {
      fn.value = fn.value * -1
      fn.vars = fn.vars.map(c => c * -1)

      switch (fn.type) {
        case '>=': fn.type = '<='; break
        case '<=': fn.type = '>='; break
        case '>': fn.type = '<'; break
        case '<': fn.type = '>'; break
        default: fn.type = '='
      }
    }

    this.restrictions.push(fn)
  }

  setRestrictions (fns) {
    fns.forEach(fn => this.addRestriction(Restriction(fn)))
  }

  // Steps.
  toStandardFn () {
    console.log('[0] Para Formula padrão.')
    this.originalType = this.fnType
    if (this.fnType === 'max') {
      this.type = 'min'
      this.costs = this.costs.map(x => x * (-1))
    }

    this.costs = [...this.costs, ...Array(this.restrictions.length).fill(0)]

    console.log(' custos =', this.costs)

    let pos = 0
    this.restrictions = this.restrictions.map(res => {
      const newVars = Array(this.restrictions.length).fill(0)

      switch (res.type) {
        case '>=': newVars[pos++] = -1; break
        case '<=': newVars[pos++] =  1;  break
        case '>':  newVars[pos++] = -1; break
        case '<':  newVars[pos++] =  1; break
        default: newVars[pos++] = 0
      }

      res.vars = [...res.vars, ...newVars]
      return res
    })
    
    this.restrictions.forEach(r => console.log('', r.vars))

    console.log()
  }

  addIdentidade() {
    this.mat.forEach((x, i) => {
      x.push(...this.restrictions.map((r, j) => i === j ? 1 : 0))
      this.costs.push(0)
    })

    this.fnSize += this.restrictions.length
  }

  setInitialBandN () {
    let bSize = this.restrictions.length
    let nSize = this.fnSize

    this.N = Array(nSize).fill(0).map((x, i) => i)
    this.B = Array(bSize).fill(0).map((x, i) => this.fnSize + i)
    console.log(' N =', this.N, ' B =', this.B)
  }

  print () {
    this.mat.forEach(row => console.log('', row))
  }

  // Methods.

  get needFase1 () {
    let need = false
    this.restrictions.map(r => {
      if (r.type !== '<=') { need = true }
    })

    return need
  }
}

class SimplexSteps {
  constructor (mat, b, costs, B, N) {
    this.b = b
    this.mat = mat
    this.costs = costs
    this.B = B
    this.N = N
  }

  exec () {

    // Run.

    for (let it = 1; true; it++) {
      console.log('\n--------------- it =', it, '-------------------\n')
      this.calcBasicSolution()
      this.calcVector()
      this.calcRelativeCosts()
      this.whoEntersInB()
      if (this.isOtimo()) {
        break
      }
      this.calcSimplexDir()
      if (this.whoLeft()) {
        break
      }
      this.refreshB()
    }

    return {
      xB: this.xB,
      N: this.N,
      B: this.B,
      S: this.S
    }
  }

  // Passo 1
  calcBasicSolution() {
    console.log('\n[1] Cálculo da solução básica.')
    // Calcular  xBi
    this.matrixB.forEach(x => console.log('', x))
    console.log(' b=', this.b)
    this.xB = gauss(this.matrixB, this.b)
    this.xB.forEach((xb, i) => console.log(` xB${i} = ${xb}`))

    // Calcular solução atual
    let xChapeu = Array(this.costs.length).fill(0)
    this.B.forEach((x, i) => xChapeu[x] = this.xB[i])
    console.log(' xChapeu =', xChapeu)
    this.S = 0
    this.costs.forEach((c, i) => {
      this.S += c * xChapeu[i]
    })
    console.log(' S* =', this.S)
  }

  // Passo 2.1
  calcVector() {
    console.log('\n[2] Cálculo custos relativos.')
    console.log(' 2.1) Vetor multiplicador simplex.')
    const Cb = this.B.map(i => this.costs[i])
    this.lambda = gauss(this.matrixBt, Cb)
    this.lambda.forEach((l, i) => console.log(`   λ${i} = ${l}`))
  }

  // Passo 2.2
  calcRelativeCosts() {
    console.log(' 2.2) Custos relativos.')
    this.CN = this.N.map(n => {
      let r = this.getCN(n) - mulMatrix(this.lambda, this.column(n))
      return r
    })

    this.CN.forEach((c, i) => console.log(`   Ĉn${i} = ${c}`))
  }

  // Passo 2.3
  whoEntersInB() {
    console.log(' 2.3) Determinação da variável a entrar na base.')
    this.Cnk = Infinity
    this.CN.forEach((x, i) => {
      if (x < this.Cnk) {
        this.k = i
        this.Cnk = x
      }
    })
    console.log(`   Ĉnk = ${this.Cnk}; k = ${this.k}.`)
  }

  // Passo 3
  isOtimo() {
    console.log('\n[3] Teste de otimalidade.')
    if (this.Cnk >= 0) {
      console.log(`Como Ĉnk=${this.Cnk} >= 0, a solução ${this.S} é ótima.`)
      return true
    }

    console.log(`Como Ĉnk=${this.Cnk} <= 0, a solução ${this.S}  não é ótima.`)
    return false
  }

  // Passo 4
  calcSimplexDir() {
    console.log('\n[4] Cálculo direção simplex.')
    console.log(this.column(this.k))
    this.y = gauss(this.matrixB, this.column(this.N[this.k]))
    console.log(' y = ', this.y)
  }

  // Passo 5
  whoLeft() {
    console.log('\n[5] Determinação do passo e variável a sair da base.')
    let yNeg = this.y.filter(x => x <= 0)
    if (yNeg.length === this.y.length) {
      console.log(` Todo y <= 0, portanto o problema não tem 
            solução otima finita.`)
      return true
    }

    console.log(' Determinar quem sai da base.')

    this.epsilonValue = Infinity
    this.epsilon = 0
    this.y.forEach((y, i) => {
      if (y > 0) {
        console.log('', this.xB[i], '/', this.y[i], '=', (this.xB[i] / this.y[i]))
        let e = this.xB[i] / this.y[i]
        if (this.epsilonValue > e) {
          this.epsilonValue = e
          this.epsilon = i
        }
      }
    })

    console.log(' epsilon =', this.epsilon)
    console.log(` B${this.epsilon} = ${this.B[this.epsilon]} sai da base.`)

    return false
  }

  // Passo 6
  refreshB() {
    console.log(`\n[6] Atualização: nova partição básica.`)
    console.log(' B =', this.B, 'N =', this.N)
    let temp = this.B[this.epsilon]
    this.B[this.epsilon] = this.N[this.k]
    this.N[this.k] = temp
    console.log(' B =', this.B, 'N =', this.N)
  }

  get matrixB() {
    let mt = _.zip(...this.mat) // transpose this.mat
    let bt = this.B.map(i => mt[i])
    return _.zip(...bt)
  }

  get matrixBt() {
    let mt = _.zip(...this.mat) // transpose this.mat
    return this.B.map(i => mt[i])
  }

  // Anx
  column(x) {
    let mt = _.zip(...this.mat)
    return mt[x]
  }

  getCN(n) {
    return this.costs[n]
  }
}

function createMatrix(restrictions) {
  return [...restrictions.map(x => x.vars)]
}

function transposeB(matrix, indexes) {
  let At = _.zip(...matrix)
  let B = indexes.map(i => At[i])
  return _.zip(...B)
}

function mulMatrix(a, b) {
  let result = 0
  a.forEach((x1, i) => {
    result += x1 * b[i]
  })
  return result
}

module.exports = Simplex
