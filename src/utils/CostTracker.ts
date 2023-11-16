import { randomUUID } from "crypto"

type Transaction = {
  id: string
  cost: number
  // time in milliseconds
  at: number
}

export class CostTracker {

  transactions: Transaction[] = []

  transact(cost: number) {
    this.transactions.push({
      id: randomUUID(),
      cost,
      at: Date.now()
    })
  }

  totalCost() {
    return this.transactions.reduce((acc, curr) => {
      return acc + curr.cost
    }, 0)
  }
}