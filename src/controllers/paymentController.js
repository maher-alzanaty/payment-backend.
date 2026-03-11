import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export const createPayment = async (req,res)=>{

 const payment = await prisma.payment.create({
  data:req.body
 })

 res.json(payment)

}

export const getPayments = async (req,res)=>{

 const payments = await prisma.payment.findMany({
  include:{
    transactions:true
  }
 })

 res.json(payments)

}