export function generateEmailTemplate(params: {
  repName: string
  zipCode: string
  amount: number
}): { subject: string; body: string } {
  const { repName, zipCode, amount } = params
  
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)

  const subject = 'Concerned constituent regarding fossil fuel donations'
  
  const body = `Dear ${repName},

I'm a constituent from ${zipCode}, and I'm concerned about your acceptance of ${formattedAmount} from fossil fuel companies.

Climate change is directly impacting our community, and I expect my representatives to prioritize clean energy and reject money from the industries driving this crisis.

I urge you to:
1. Sign the No Fossil Fuel Money Pledge
2. Support legislation to accelerate the clean energy transition
3. Reject future donations from oil, gas, and coal interests

I'll be watching your voting record closely.

[Your Name]`

  return { subject, body }
}

export function generateMailtoLink(params: {
  email: string
  repName: string
  zipCode: string
  amount: number
}): string {
  const { email, repName, zipCode, amount } = params
  const { subject, body } = generateEmailTemplate({ repName, zipCode, amount })
  
  const encodedSubject = encodeURIComponent(subject)
  const encodedBody = encodeURIComponent(body)
  
  return `mailto:${email}?subject=${encodedSubject}&body=${encodedBody}`
}
