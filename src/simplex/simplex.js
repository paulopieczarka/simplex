const gauss = require('./gaussian-elimination')
const _ = require('underscore')

const Restriction = (fn) => ({
  type: fn.splice(-2, 1)[0],
  value: fn.splice(-1, 1)[0],
  vars: fn
})

class Simplex {
  constructor() {
    this.costs = [] // função objetivo
    this.restrictions = [] // restrições
  }

  setFn(fnArray) {
    this.type = fnArray.splice(0, 1)[0] // max or min
    fnArray.forEach(x => this.costs.push(x))
    this.fnSize = this.costs.length
  }

  addRestriction(fn) {
    // Quando b for negativo, inverte função.
    if (fn.value < 0) {
      console.log('INVERTENDO --> ', fn)
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
    console.log(fn)
    this.restrictions.push(fn)
  }

  setRestrictions(fns) {
    fns.forEach(f => this.addRestriction(Restriction(f)))
  }

  // Passo 0
  toStandardFn() {
    console.log('[0] Para Formula padrão.')
    this.originalType = this.type
    if (this.type === 'max') {
      this.type = 'min'
      this.costs = this.costs.map(x => x * (-1))
    }

    this.costs = [...this.costs, ...Array(this.restrictions.length).fill(0)]
    console.log('CustosB = ', this.costs)

    let pos = 0, needFaseI = false
    this.restrictions = this.restrictions.map(r => {
      if (r.type !== '<=') {
        needFaseI = true
      }

      const newVars = Array(this.restrictions.length).fill(0)
      newVars[pos++] = getSign(r.type)
      r.vars = [...r.vars, ...newVars]
      return r
    })

    this.mat = createMatrix(this.restrictions)
    this.b = this.restrictions.map(x => x.value)

    this.printMat()

    if (needFaseI) {
      console.log('[[[[ FASE É NECESSÁRIA ]]]]')
      this.addIdentidade()
      this.printMat()
    }

    // Separar N e B
    let bSize = this.restrictions.length
    let nSize = this.fnSize

    console.log(Array(bSize).fill(0).map((x, i) => this.fnSize + i))

    this.N = Array(nSize).fill(0).map((x, i) => i)
    this.B = Array(bSize).fill(0).map((x, i) => this.fnSize + i)
    console.log('N =', this.N, ' B =', this.B)
  }

  addIdentidade() {
    this.mat.forEach((x, i) => {
      x.push(...this.restrictions.map((r, j) => i === j ? 1 : 0))
      this.costs.push(0)
    })

    this.fnSize += this.restrictions.length
  }

  // Passo 1
  calcBasicSolution() {
    console.log('\n[1] Cálculo da solução básica.')
    // Calcular  xBi
    console.log(this.matrixB, this.b)
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

  solve() {
    console.log('Simplex.')

    this.toStandardFn()
    //console.log(this.matrixB)
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

    console.log('\n\n*** FIM ***\n')

    if (this.originalType === 'max') {
      this.S *= -1
    }

    console.log(' Solução', this.originalType, 'f(x) =', this.S)
    this.xB.forEach((xb, i) => console.log(` x${i} = ${xb}`))
    console.log()
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

  printMat(m = this.mat) {
    m.forEach(row => {
      console.log(row)
    })
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

function getSign(x) {
  return x === '='
    ? 0 : x === '<='
      ? 1 : x === '>='
        ? -1 : NaN

}

module.exports = Simplex;
