import { Body, Controller, Get, Headers, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('initiate')
  async initiate(@Req() req: any, @Body('amount') amount: number) {
    return this.paymentsService.initiatePayment(req.user.id, Number(amount));
  }

  @UseGuards(JwtAuthGuard)
  @Get('verify/:reference')
  async verify(@Param('reference') reference: string) {
    return this.paymentsService.verifyAndApply(reference);
  }

  @Post('webhook')
  async webhook(
    @Headers('x-paystack-signature') signature: string | undefined,
    @Req() req: any,
  ) {
    return this.paymentsService.processWebhook(signature, req.rawBody, req.body);
  }
}
