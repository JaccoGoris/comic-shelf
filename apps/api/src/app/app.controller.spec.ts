import { Test, TestingModule } from '@nestjs/testing'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { PrismaService } from '@comic-shelf/db'

describe('AppController', () => {
  let app: TestingModule

  beforeAll(async () => {
    app = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: PrismaService, useValue: { $queryRaw: jest.fn().mockResolvedValue([]) } },
      ],
    }).compile()
  })

  describe('getData', () => {
    it('should return "Hello API"', () => {
      const appController = app.get<AppController>(AppController)
      expect(appController.getData()).toEqual({ message: 'Hello API' })
    })
  })
})
