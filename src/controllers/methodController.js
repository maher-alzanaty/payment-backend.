import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export const createMethod = async (req, res) => {

 const method = await prisma.paymentMethod.create({
  data:req.body
 })

 res.json(method)
}

export const getMethods = async (req,res)=>{

 const methods = await prisma.paymentMethod.findMany()

 res.json(methods)

}