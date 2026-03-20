import rclpy
from rclpy.node import Node
import random
import math

# messageTypes
from sensor_msgs.msg import BatteryState, Temperature
from std_msgs.msg import Float32, Int32MultiArray
from geometry_msgs.msg import Quaternion, Vector3

class SentinelSimulator(Node):
    def __init__(self):
        super().__init__('sentinel_simulator')
        
        # publishers
        self.pub_battery = self.create_publisher(BatteryState, '/Battery', 10)
        self.pub_temp = self.create_publisher(Temperature, '/Temperature', 10)
        self.pub_pressure = self.create_publisher(Float32, '/adc/pressure', 10)
        self.pub_thrusters = self.create_publisher(Int32MultiArray, '/propulsores_array', 10)

        self.pub_quat = self.create_publisher(Quaternion, '/quaternions', 10)
        self.pub_vel = self.create_publisher(Vector3, '/velocidade_angular', 10)
        self.pub_accel = self.create_publisher(Vector3, '/aceleracao_linear', 10)
        
        # timer de 0.1s (10Hz)
        timer_period = 0.1 
        self.timer = self.create_timer(timer_period, self.publish_data)
        
        # estados iniciais
        self.battery_pct = 1.00
        self.battery_voltage = 12.0
        self.temperature = 32.0
        self.pressure = 12.5
        self.time_counter = 0.0

        self.get_logger().info('Simulador Sentinel!')

    def publish_data(self):
        self.time_counter += 0.1

        self.battery_pct -= random.uniform(0.00002, 0.0001)
        if self.battery_pct < 0.0:
            self.battery_pct = 0.0
        
        self.battery_voltage = 9.0 + (self.battery_pct * 2.8)
        msg_battery = BatteryState()
        msg_battery.percentage = self.battery_pct
        msg_battery.voltage = self.battery_voltage
        self.pub_battery.publish(msg_battery)

        self.temperature += random.uniform(-0.1, 0.1) + math.sin(self.time_counter / 10.0) * 0.05
        msg_temp = Temperature()
        msg_temp.temperature = self.temperature
        self.pub_temp.publish(msg_temp)

        self.pressure += random.uniform(-0.02, 0.02)
        msg_pressure = Float32()
        msg_pressure.data = self.pressure
        self.pub_pressure.publish(msg_pressure)

        # propulsores em cada 0.5s
        if int(self.time_counter * 10) % 5 == 0:
            thrusters_data = []
            for _ in range(8):
                is_firing = 1 if random.random() > 0.85 else 0
                thrusters_data.append(is_firing)
            msg_thrusters = Int32MultiArray()
            msg_thrusters.data = thrusters_data
            self.pub_thrusters.publish(msg_thrusters)

        angulo = self.time_counter % (2 * math.pi) 
        
        # (0 = X, 1 = Y, 2 = Z)
        fase = int(self.time_counter / (2 * math.pi)) % 3

        msg_quat = Quaternion()
        msg_vel = Vector3()
        msg_accel = Vector3()

        msg_accel.x = random.uniform(-0.5, 0.5)
        msg_accel.y = random.uniform(-0.5, 0.5)
        msg_accel.z = math.sin(self.time_counter * 0.5) * 20.0

        sin_a = math.sin(angulo / 2.0)
        cos_a = math.cos(angulo / 2.0)

        if fase == 0:
            # roll (X)
            msg_quat.x = sin_a
            msg_quat.y = 0.0
            msg_quat.z = 0.0
            msg_quat.w = cos_a
            
            # vel. angular (x)
            msg_vel.x = 1.0 + random.uniform(-0.02, 0.02)
            msg_vel.y = random.uniform(-0.02, 0.02)
            msg_vel.z = random.uniform(-0.02, 0.02)

        elif fase == 1:
            # pitch (y)
            msg_quat.x = 0.0
            msg_quat.y = sin_a
            msg_quat.z = 0.0
            msg_quat.w = cos_a
            
            msg_vel.x = random.uniform(-0.02, 0.02)
            msg_vel.y = 1.0 + random.uniform(-0.02, 0.02)
            msg_vel.z = random.uniform(-0.02, 0.02)

        else:
            # yaw (z)
            msg_quat.x = 0.0
            msg_quat.y = 0.0
            msg_quat.z = sin_a
            msg_quat.w = cos_a
            
            msg_vel.x = random.uniform(-0.02, 0.02)
            msg_vel.y = random.uniform(-0.02, 0.02)
            msg_vel.z = 1.0 + random.uniform(-0.02, 0.02)

        # publicar
        self.pub_quat.publish(msg_quat)
        self.pub_vel.publish(msg_vel)
        self.pub_accel.publish(msg_accel)

def main(args=None):
    rclpy.init(args=args)
    simulador = SentinelSimulator()
    try:
        rclpy.spin(simulador)
    except KeyboardInterrupt:
        pass
    finally:
        simulador.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()